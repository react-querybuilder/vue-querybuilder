import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  // The published stylesheet, imported by its public specifier — this example consumes the
  // built `dist`, so it exercises the package `exports` map rather than the source tree.
  css: ['@react-querybuilder/vue/dist/query-builder.css'],
  nitro: {
    // The `node` preset exports a plain Node request handler, which lets `ssr-smoke-test.ts`
    // serve the build on an ephemeral port from a programmatic API. A spawned CLI
    // (`nuxt preview`) can leave an orphan holding the port and serving a stale build.
    preset: 'node',
  },
  typescript: {
    // Nuxt's generated tsconfig is what `bun run check` compiles; see `tsconfig.json`.
    typeCheck: false,
  },
});
