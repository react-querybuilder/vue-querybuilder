/**
 * Normalizes the `.vue` declaration output so that nothing in the published type surface refers
 * to a `.vue` file.
 *
 * `vue-tsc` emits `Foo.vue.d.ts` for `Foo.vue` and copies `./Foo.vue` specifiers into the
 * emitted declarations verbatim. Neither `tsc` nor `vue-tsc` can resolve such a specifier from a
 * `.d.ts` in `node_modules`: TypeScript strips the `.vue` extension and looks for
 * `Foo.d.vue.ts`, and Volar resolves it to the SFC source, which is not published. Consumers
 * only escape the resulting `TS2307` by way of `skipLibCheck`.
 *
 * So this rewrites the emitted declarations to describe the JavaScript that is actually
 * published: `Foo.vue.d.ts` becomes `Foo.d.ts` — the declaration file for the emitted `Foo.js` —
 * and every `./Foo.vue` specifier becomes `./Foo.js`. Standard TypeScript resolution then maps
 * `./Foo.js` to `Foo.d.ts` for types and to `Foo.js` at runtime, which is exactly right for both
 * `tsc` and `vue-tsc`. The declaration content is untouched.
 */
import { Glob } from 'bun';
import { existsSync } from 'node:fs';
import { rename, unlink } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const distDir = resolve(new URL('..', import.meta.url).pathname, 'dist');

if (!existsSync(distDir)) {
  console.error('dist/ not found — run `bun run build` first.');
  process.exit(1);
}

/** `from './Foo.vue'`, `import('./Foo.vue')`, and `import './Foo.vue'`. */
const VUE_SPECIFIER = /(['"])(\.\.?\/[^'"]*)\.vue\1/g;

let renamed = 0;
let rewritten = 0;

// `Foo.vue.d.ts` -> `Foo.d.ts`, and the same for the declaration map. The map's `file` field and
// the `sourceMappingURL` comment both name the declaration file, so both are updated too.
for await (const rel of new Glob('**/*.vue.d.ts{,.map}').scan(distDir)) {
  const from = resolve(distDir, rel);
  const to = from.replace(/\.vue\.d\.ts/, '.d.ts');

  if (existsSync(to)) {
    console.error(`Refusing to overwrite ${basename(to)}: a non-SFC module of that name exists.`);
    process.exit(1);
  }

  if (rel.endsWith('.map')) {
    const map = JSON.parse(await Bun.file(from).text());
    map.file = String(map.file).replace(/\.vue\.d\.ts$/, '.d.ts');
    await Bun.write(to, JSON.stringify(map));
    await unlink(from);
  } else {
    await rename(from, to);
  }
  renamed++;
}

// `./Foo.vue` -> `./Foo.js`, plus the `sourceMappingURL` comment left behind by the rename.
for await (const rel of new Glob('**/*.d.ts').scan(distDir)) {
  const file = resolve(distDir, rel);
  const source = await Bun.file(file).text();
  const next = source
    .replaceAll(VUE_SPECIFIER, (_m, quote, spec) => `${quote}${spec}.js${quote}`)
    .replace(/(\/\/# sourceMappingURL=\S*?)\.vue\.d\.ts\.map/, '$1.d.ts.map');

  if (next !== source) {
    await Bun.write(file, next);
    rewritten++;
  }
}

// A leftover `.vue` anywhere in the declarations means a case this script does not handle.
const stragglers: string[] = [];
for await (const rel of new Glob('**/*.d.ts').scan(distDir)) {
  const source = await Bun.file(resolve(dirname(distDir), 'dist', rel)).text();
  if (VUE_SPECIFIER.test(source)) stragglers.push(rel);
  VUE_SPECIFIER.lastIndex = 0;
}

if (stragglers.length > 0) {
  console.error(`'.vue' specifiers remain in dist/: ${stragglers.join(', ')}`);
  process.exit(1);
}

console.log(`Normalized ${renamed} SFC declaration file(s); rewrote ${rewritten} file(s).`);
