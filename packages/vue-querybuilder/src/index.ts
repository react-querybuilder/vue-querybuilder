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
export { QueryBuilderLabel } from './internal/QueryBuilderLabel.js';
export type { QueryBuilderLabelProps } from './internal/QueryBuilderLabel.js';
export * from './plugin.js';
export type * from './types/index.js';
