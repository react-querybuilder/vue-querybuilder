import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*/vite.config.ts'],
    // Coverage is resolved from the root config only; a `coverage` block in the package's
    // `vite.config.ts` is silently ignored when the suite runs through `projects`, which is
    // how CI runs it.
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**'],
      exclude: ['**/*.{test,spec,test-d}.*'],
      thresholds: {
        lines: 80,
        // The reactive layer is load-bearing and has no DOM to backstop it, so it carries a
        // higher bar than the package as a whole. Per-glob thresholds are absolute paths.
        'packages/*/src/composables/**': { lines: 90 },
      },
    },
  },
});
