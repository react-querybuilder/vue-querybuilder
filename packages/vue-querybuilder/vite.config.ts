import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: [
        resolve(import.meta.dirname, 'src/index.ts'),
        // A second entry so that `@react-querybuilder/vue/resolver` is a real subpath export
        // with its own declaration file, rather than a source file shipped as-is.
        resolve(import.meta.dirname, 'src/resolver.ts'),
      ],
      formats: ['es'],
    },
    rollupOptions: {
      external: ['vue', /^@react-querybuilder\/core/],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
    // `build:css` writes into the same directory afterward, and `build:types` follows.
    emptyOutDir: true,
  },
  test: {
    name: 'vue-querybuilder',
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    setupFiles: ['./vitest-setup.ts'],
  },
});
