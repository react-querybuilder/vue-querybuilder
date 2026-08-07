import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const pkgRoot = resolve(import.meta.dirname, '../../packages/vue-querybuilder');
const coreDist = resolve(import.meta.dirname, '../../node_modules/@react-querybuilder/core/dist');

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      // The stylesheets are resolved before the bare specifier so the
      // `@react-querybuilder/vue` alias below cannot swallow them. `dist/*.css` is
      // byte-identical to core's, so pointing at core lets `main.ts` write the exact import
      // line a real consumer writes, with no library build required first.
      { find: /^@react-querybuilder\/vue\/dist\/(.*\.css)$/, replacement: `${coreDist}/$1` },
      // The library *source*, not `dist` — HMR straight through to the components.
      { find: /^@react-querybuilder\/vue$/, replacement: `${pkgRoot}/src/index.ts` },
    ],
  },
});
