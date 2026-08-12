/**
 * Guards the published output against unresolvable relative import specifiers.
 *
 * Rollup rewrites specifiers in the emitted JS, but `vue-tsc` copies them through verbatim into
 * the `.d.ts` files, so an extensionless or directory import in `src` survives into `dist` and
 * breaks Node16/NodeNext ESM resolution for consumers (`ERR_UNSUPPORTED_DIR_IMPORT`). Bundlers
 * tolerate it, so nothing else in CI notices.
 *
 * `.vue` specifiers are rejected outright: `scripts/normalize-sfc-declarations.ts` rewrites them
 * to the `./Foo.js` form that both `tsc` and `vue-tsc` can resolve, so one surviving in `dist`
 * means that step did not run or did not cover a case.
 *
 * Also checks the `exports` map itself: every target must exist in `dist/`, and every conditional
 * entry must list `types` first. `attw` catches a missing `types` condition but not a target that
 * was never built, and condition order is significant — the first match wins, so a `types` after
 * `import` is never consulted.
 */
import { Glob } from 'bun';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const distDir = resolve(new URL('..', import.meta.url).pathname, 'dist');

if (!existsSync(distDir)) {
  console.error('dist/ not found — run `bun run build` first.');
  process.exit(1);
}

/** Extensions that resolve without further lookup in Node ESM. */
const RESOLVABLE = ['.js', '.css', '.scss', '.json'];

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*)(['"])(\.\.?\/[^'"]*)\1/g;

/**
 * A `./foo.js` specifier in a `.d.ts` file may also legitimately resolve to a sibling `foo.d.ts`
 * with no `foo.js` alongside it: that is what a type-only module looks like after the bundler
 * erases it. TypeScript resolves the specifier through the declaration file, and the import
 * itself never exists at runtime.
 */
const resolvesTo = (from: string, spec: string): boolean => {
  const abs = resolve(dirname(from), spec);
  if (existsSync(abs)) return true;
  if (from.endsWith('.d.ts') && spec.endsWith('.js')) {
    return existsSync(abs.replace(/\.js$/, '.d.ts'));
  }
  return false;
};

const failures: string[] = [];

// ---- `exports` map -------------------------------------------------------------------------

const packageJsonPath = resolve(distDir, '..', 'package.json');
const exportsMap = (await Bun.file(packageJsonPath).json()).exports as Record<
  string,
  string | Record<string, string>
>;

for (const [subpath, entry] of Object.entries(exportsMap)) {
  // Wildcard entries (the stylesheets) and `./package.json` are not build outputs.
  if (subpath.includes('*') || subpath === './package.json') continue;

  if (typeof entry === 'string') {
    failures.push(`exports["${subpath}"]: must be a conditional object with a \`types\` key`);
    continue;
  }

  const conditions = Object.keys(entry);
  if (conditions[0] !== 'types') {
    failures.push(
      `exports["${subpath}"]: 'types' must be the first condition (found '${conditions[0]}')`
    );
  }
  for (const [condition, target] of Object.entries(entry)) {
    if (!existsSync(resolve(distDir, '..', target))) {
      failures.push(`exports["${subpath}"].${condition}: '${target}' does not exist`);
    }
  }
}

// ---- relative specifiers -------------------------------------------------------------------

for await (const rel of new Glob('**/*.{js,d.ts}').scan(distDir)) {
  const file = resolve(distDir, rel);
  const source = await Bun.file(file).text();

  for (const [, , spec] of source.matchAll(SPECIFIER)) {
    if (!RESOLVABLE.some(ext => spec.endsWith(ext))) {
      failures.push(`${rel}: '${spec}' has no file extension (directory or extensionless import)`);
      continue;
    }
    if (!resolvesTo(file, spec)) {
      failures.push(`${rel}: '${spec}' does not exist in dist/`);
    }
  }
}

if (failures.length > 0) {
  console.error('Problems in the published surface:\n');
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    `\n${failures.length} problem(s). Relative imports in src must carry explicit extensions, ` +
      'and every `exports` entry must point at a built file with `types` listed first.'
  );
  process.exit(1);
}

console.log('dist/ exports map and relative specifiers OK.');
