/**
 * Public entry point for `vue-querybuilder`.
 *
 * Components, composables, and types land in steps 2-7. Until then this barrel re-exports
 * `@react-querybuilder/core` so that consumers never need a direct dependency on core, and so
 * that the build, declaration emit, and `check:exports` gates all have real output to inspect.
 */
export * from '@react-querybuilder/core';
