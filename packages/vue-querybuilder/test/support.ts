import type {
  QueryActions,
  RuleGroupType,
  RuleGroupTypeAny,
  RuleType,
} from '@react-querybuilder/core';
import { defaultTranslations } from '@react-querybuilder/core';
import type { RenderResult } from '@testing-library/vue';
import { render } from '@testing-library/vue';
import type { EffectScope } from 'vue';
import { defineComponent, effectScope, h } from 'vue';
import { QueryBuilderPlugin } from '../src/plugin.js';
import type { QueryBuilderProps, RuleGroupProps, RuleProps } from '../src/types/index.js';

/**
 * Test support for the composable suites. Lives outside `src/` so it is neither built into
 * `dist` nor counted against the coverage threshold.
 */

/** A deterministic id generator, so seeded queries are reproducible. */
export const createIdGenerator = (prefix = 'id'): (() => string) => {
  let i = 0;
  return () => `${prefix}-${i++}`;
};

export const testFields = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
  { name: 'age', label: 'Age', inputType: 'number' as const },
];

/**
 * Runs `fn` inside a detached effect scope and returns both its result and the scope, so a suite
 * can dispose the scope and assert teardown behavior.
 */
export const runInScope = <T>(fn: () => T): { result: T; scope: EffectScope } => {
  const scope = effectScope();
  const result = scope.run(fn)!;
  return { result, scope };
};

/** A no-op {@link QueryActions} whose calls are recorded, for `useRule`/`useRuleGroup`. */
export interface RecordedAction {
  name: string;
  // oxlint-disable-next-line typescript/no-explicit-any
  args: any[];
}

export const createRecordingActions = (): { actions: QueryActions; calls: RecordedAction[] } => {
  const calls: RecordedAction[] = [];
  // oxlint-disable-next-line typescript/no-explicit-any
  const record =
    (name: string) =>
    (...args: any[]) => {
      calls.push({ name, args });
    };

  return {
    calls,
    actions: {
      onRuleAdd: record('onRuleAdd'),
      onGroupAdd: record('onGroupAdd'),
      onPropChange: record('onPropChange'),
      onRuleRemove: record('onRuleRemove'),
      onGroupRemove: record('onGroupRemove'),
      moveRule: record('moveRule'),
      groupRule: record('groupRule'),
      ungroupRuleGroup: record('ungroupRuleGroup'),
    } as unknown as QueryActions,
  };
};

/**
 * The default `QueryBuilder` props used across the suites.
 *
 * Overrides are loosely typed: `Partial<QueryBuilderProps<RuleGroupTypeAny>>` distributes over
 * the `RuleGroupType | RuleGroupTypeIC` conditional and collapses to the IC branch, which would
 * reject a standard query.
 */
export const baseProps = (
  overrides: Record<string, unknown> = {}
): QueryBuilderProps<RuleGroupTypeAny> =>
  ({
    fields: testFields,
    idGenerator: createIdGenerator(),
    ...overrides,
  }) as QueryBuilderProps<RuleGroupTypeAny>;

export const flatQuery: RuleGroupType = {
  combinator: 'and',
  rules: [
    { id: 'r0', field: 'firstName', operator: '=', value: 'Steve' },
    { id: 'r1', field: 'lastName', operator: '=', value: 'Vai' },
  ],
};

/** Synthesizes {@link RuleProps} from a query builder state. */
export const ruleProps = (
  // oxlint-disable-next-line typescript/no-explicit-any
  state: any,
  rule: RuleType,
  overrides: Partial<RuleProps> = {}
  // The index signature is what a generic SFC's props parameter requires: `vue-tsc` types it as
  // `Props & Record<string, unknown>`, and an interface has no index signature of its own.
): RuleProps & Record<string, unknown> => ({
  rule,
  path: [0],
  schema: state.schema.value,
  actions: state.actions,
  translations: defaultTranslations as never,
  ...overrides,
});

/** Synthesizes {@link RuleGroupProps} from a query builder state. */
export const ruleGroupProps = (
  // oxlint-disable-next-line typescript/no-explicit-any
  state: any,
  ruleGroup: RuleGroupTypeAny,
  overrides: Partial<RuleGroupProps> = {}
  // See `ruleProps`.
): RuleGroupProps & Record<string, unknown> => ({
  ruleGroup,
  path: [],
  schema: state.schema.value,
  actions: state.actions,
  translations: defaultTranslations as never,
  ...overrides,
});

/** Mounts a component with no providers, for the internal parts' injection guards. */
export const mountBare = (component: unknown): RenderResult =>
  render(defineComponent({ render: () => h(component as never) }));

/** Mounts `template` in an app with {@link QueryBuilderPlugin} installed. */
export const mountWithPlugin = (template: string, options?: { prefix?: string }): RenderResult =>
  render(defineComponent({ template }), {
    global: { plugins: [options ? [QueryBuilderPlugin, options] : QueryBuilderPlugin] },
  });
