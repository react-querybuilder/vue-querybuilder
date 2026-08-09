/**
 * Public entry point for `@react-querybuilder/vue`.
 *
 * Re-exports the type layer, the reactive (composables) layer, and the components — alongside
 * a verbatim re-export of `@react-querybuilder/core` so that consumers never need a direct
 * dependency on core.
 */
export * from '@react-querybuilder/core';
export * from './components/index.js';
export * from './composables/index.js';
export { Label } from './internal/Label.js';
export type { LabelProps } from './internal/Label.js';
export type * from './types/index.js';
