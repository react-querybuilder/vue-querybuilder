/**
 * Public entry point for `vue-querybuilder`.
 *
 * Components and composables land in steps 3-7. The type layer lands in step 2, alongside a
 * verbatim re-export of `@react-querybuilder/core` so that consumers never need a direct
 * dependency on core.
 */
export * from '@react-querybuilder/core';
export type * from './types/index.js';
