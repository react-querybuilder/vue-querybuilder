/**
 * Public entry point for `vue-querybuilder`.
 *
 * The type layer landed in step 2, the reactive layer in step 3, and the components in steps
 * 4-7 — alongside a verbatim re-export of `@react-querybuilder/core` so that consumers never
 * need a direct dependency on core.
 */
export * from '@react-querybuilder/core';
export * from './components/index.js';
export * from './composables/index.js';
export { Label } from './internal/Label.js';
export type { LabelProps } from './internal/Label.js';
export type * from './types/index.js';
