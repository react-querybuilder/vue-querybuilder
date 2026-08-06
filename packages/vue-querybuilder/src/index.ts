/**
 * Public entry point for `vue-querybuilder`.
 *
 * Components land in steps 4-7. The type layer landed in step 2 and the reactive layer in step
 * 3, alongside a verbatim re-export of `@react-querybuilder/core` so that consumers never need a
 * direct dependency on core.
 */
export * from '@react-querybuilder/core';
export * from './composables/index.js';
export type * from './types/index.js';
