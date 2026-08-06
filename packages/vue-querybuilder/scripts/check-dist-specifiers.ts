/**
 * Guards the published output against unresolvable relative import specifiers.
 *
 * Rollup rewrites specifiers in the emitted JS, but `vue-tsc` copies them through verbatim into
 * the `.d.ts` files, so an extensionless or directory import in `src` survives into `dist` and
 * breaks Node16/NodeNext ESM resolution for consumers (`ERR_UNSUPPORTED_DIR_IMPORT`). Bundlers
 * tolerate it, so nothing else in CI notices.
 *
 * `attw` can't catch this on its own: it reports `.vue` imports in `.d.ts` files as errors too
 * (TypeScript has no built-in `.vue` resolver). This check is the narrow, false-positive-free
 * version.
 */
import { Glob } from 'bun';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const distDir = resolve(new URL('..', import.meta.url).pathname, 'dist');

if (!existsSync(distDir)) {
  console.error('dist/ not found — run `bun run build` first.');
  process.exit(1);
}

/** Extensions that resolve without further lookup in Node ESM (or via the Vue/Vite plugin). */
const RESOLVABLE = ['.js', '.vue', '.css', '.scss', '.json'];

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*)(['"])(\.\.?\/[^'"]*)\1/g;

/**
 * `vue-tsc` emits `Foo.vue.d.ts` for `Foo.vue`, so a `./Foo.vue` specifier resolves to either.
 *
 * A `./foo.js` specifier in a `.d.ts` file may also legitimately resolve to a sibling `foo.d.ts`
 * with no `foo.js` alongside it: that is what a type-only module looks like after the bundler
 * erases it. TypeScript resolves the specifier through the declaration file, and the import
 * itself never exists at runtime.
 */
const resolvesTo = (from: string, spec: string): boolean => {
  const abs = resolve(dirname(from), spec);
  if (existsSync(abs)) return true;
  if (spec.endsWith('.vue')) return existsSync(`${abs}.d.ts`);
  if (from.endsWith('.d.ts') && spec.endsWith('.js')) {
    return existsSync(abs.replace(/\.js$/, '.d.ts'));
  }
  return false;
};

const failures: string[] = [];

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
  console.error('Unresolvable relative specifiers in dist/:\n');
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    `\n${failures.length} problem(s). Relative imports in src must carry explicit extensions.`
  );
  process.exit(1);
}

console.log('dist/ relative specifiers OK.');
