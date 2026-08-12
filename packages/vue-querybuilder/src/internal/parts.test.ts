import { describe, expect, it } from 'vitest';
import { mountBare } from '../../test/support.js';
import RuleComponents from './RuleComponents.vue';
import RuleGroupBody from './RuleGroupBody.vue';
import RuleGroupHeader from './RuleGroupHeader.vue';
import RuleSubQuery from './RuleSubQuery.vue';

/**
 * The four internal components read everything they render through injection, so mounting one
 * outside its provider is a programming error and must fail loudly rather than render a
 * half-empty tree. These are the guards from `parts.ts`.
 */
describe('internal parts injection guards', () => {
  it.each([
    ['RuleComponents', RuleComponents],
    ['RuleSubQuery', RuleSubQuery],
  ])('%s throws when mounted outside a `Rule`', (_name, component) => {
    expect(() => mountBare(component)).toThrow(/rule internals used outside of `Rule`/);
  });

  it.each([
    ['RuleGroupHeader', RuleGroupHeader],
    ['RuleGroupBody', RuleGroupBody],
  ])('%s throws when mounted outside a `RuleGroup`', (_name, component) => {
    expect(() => mountBare(component)).toThrow(/group internals used outside of `RuleGroup`/);
  });
});
