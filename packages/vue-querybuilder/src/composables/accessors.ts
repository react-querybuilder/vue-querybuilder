import type {
  FullField,
  Path,
  QueryActions,
  RuleGroupTypeAny,
  RuleType,
} from '@react-querybuilder/core';
import type { ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue';
import { computed, getCurrentInstance, inject, provide, toValue } from 'vue';
import type { Schema } from '../types/schema.js';

/**
 * Injection accessors for replacement controls.
 *
 * Every subcomponent still receives `schema`, `actions`, `path`, and `rule`/`ruleGroup` as props
 * — that prop bag is the parity contract with React Query Builder and does not change. These
 * accessors are the additive, Vue-idiomatic path to the same values: **props for parity, inject
 * for ergonomics**. A component written for this port can declare no props at all and read what
 * it needs here; a component ported from React Query Builder keeps working unchanged.
 *
 * Every accessor returns `undefined` when there is no provider, and is safe to call outside of a
 * component instance (as in a unit test), where it also returns `undefined`.
 */

// oxlint-disable-next-line typescript/no-explicit-any
type AnySchema = Schema<any, any>;

const schemaKey = Symbol('@react-querybuilder/vue:schema') as InjectionKey<ComputedRef<AnySchema>>;

const actionsKey = Symbol('@react-querybuilder/vue:actions') as InjectionKey<
  ComputedRef<QueryActions>
>;

const currentRuleKey = Symbol('@react-querybuilder/vue:currentRule') as InjectionKey<
  ComputedRef<RuleType> | undefined
>;

const currentRuleGroupKey = Symbol('@react-querybuilder/vue:currentRuleGroup') as InjectionKey<
  ComputedRef<RuleGroupTypeAny> | undefined
>;

const currentPathKey = Symbol('@react-querybuilder/vue:currentPath') as InjectionKey<
  ComputedRef<Path>
>;

const injectIfMounted = <T>(key: InjectionKey<T>): T | undefined =>
  getCurrentInstance() ? inject(key, undefined) : undefined;

/**
 * Provides the schema and actions in effect for a subtree. Called by `QueryBuilder` and again by
 * `Rule`/`RuleGroup`, so that a subquery's descendants see the subquery's own schema rather than
 * the enclosing query builder's.
 */
export const provideQueryBuilderNode = (
  schema: MaybeRefOrGetter<AnySchema>,
  actions: MaybeRefOrGetter<QueryActions>
): void => {
  provide(
    schemaKey,
    computed(() => toValue(schema))
  );
  provide(
    actionsKey,
    computed(() => toValue(actions))
  );
};

/**
 * Provides the rule rendered by the enclosing `Rule`. Also shadows the group key with
 * `undefined`, so a rule inside a subquery does not report the enclosing group as its own.
 */
export const provideCurrentRule = (
  rule: MaybeRefOrGetter<RuleType>,
  path: MaybeRefOrGetter<Path>
): void => {
  provide(
    currentRuleKey,
    computed(() => toValue(rule))
  );
  provide(currentRuleGroupKey, undefined);
  provide(
    currentPathKey,
    computed(() => toValue(path))
  );
};

/** Provides the group rendered by the enclosing `RuleGroup`. Counterpart to {@link provideCurrentRule}. */
export const provideCurrentRuleGroup = (
  ruleGroup: MaybeRefOrGetter<RuleGroupTypeAny>,
  path: MaybeRefOrGetter<Path>
): void => {
  provide(
    currentRuleGroupKey,
    computed(() => toValue(ruleGroup))
  );
  provide(currentRuleKey, undefined);
  provide(
    currentPathKey,
    computed(() => toValue(path))
  );
};

/**
 * The {@link Schema} in effect, or `undefined` outside a `QueryBuilder`.
 *
 * Equivalent to the `schema` prop every subcomponent receives.
 */
export const useSchema = <F extends FullField = FullField, O extends string = string>():
  | ComputedRef<Schema<F, O>>
  | undefined => injectIfMounted(schemaKey) as ComputedRef<Schema<F, O>> | undefined;

/**
 * The {@link QueryActions} in effect, or `undefined` outside a `QueryBuilder`.
 *
 * Equivalent to the `actions` prop every subcomponent receives.
 */
export const useQueryBuilderActions = (): ComputedRef<QueryActions> | undefined =>
  injectIfMounted(actionsKey);

/**
 * The rule rendered by the enclosing `Rule`, or `undefined` when the nearest enclosing node is a
 * group — including inside a replacement `rule` component, which *is* the rule and receives it
 * as a prop.
 */
export const useCurrentRule = (): ComputedRef<RuleType> | undefined =>
  injectIfMounted(currentRuleKey);

/**
 * The group rendered by the enclosing `RuleGroup`, or `undefined` when the nearest enclosing node
 * is a rule. Counterpart to {@link useCurrentRule}.
 */
export const useCurrentRuleGroup = (): ComputedRef<RuleGroupTypeAny> | undefined =>
  injectIfMounted(currentRuleGroupKey);

/**
 * The path of the nearest enclosing rule or group, or `undefined` when there is neither.
 *
 * Equivalent to the `path` prop every subcomponent receives. The root group's path is `[]`.
 */
export const useCurrentPath = (): ComputedRef<Path> | undefined => injectIfMounted(currentPathKey);
