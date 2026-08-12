import type { ComputedRef, InjectionKey, MaybeRefOrGetter, Reactive } from 'vue';
import { computed, inject, provide, reactive, toValue } from 'vue';
import type { UseRuleReturn } from '../composables/useRule.js';
import type { UseRuleGroupReturn } from '../composables/useRuleGroup.js';
import type { RuleGroupProps, RuleProps } from '../types/props.js';

/**
 * The internal channel between `Rule`/`RuleGroup` and the presentational components they are
 * composed of (`RuleComponents`, `RuleSubQuery`, `RuleGroupHeader`, `RuleGroupBody`).
 *
 * Not public API. The keys are module-private symbols, reachable only through the provide/use
 * pairs below, and this module is not re-exported from the package entry point.
 *
 * `parts` is unwrapped with `reactive` once here, at the provider, rather than once per consumer:
 * `useRule`/`useRuleGroup` return a container of refs, and a `reactive` proxy of that container
 * yields each `.value` on access while leaving the plain handler functions alone.
 */

interface Internals<P, R extends object> {
  /** The owning component's props. A `ComputedRef`, so it auto-unwraps in a template. */
  readonly props: ComputedRef<P>;
  /** The `useRule`/`useRuleGroup` return object, ref-unwrapped. */
  readonly parts: Reactive<R>;
}

export type RuleInternals = Internals<RuleProps, UseRuleReturn>;
export type RuleGroupInternals = Internals<RuleGroupProps, UseRuleGroupReturn>;

const ruleInternalsKey = Symbol('@react-querybuilder/vue:rule') as InjectionKey<RuleInternals>;

const ruleGroupInternalsKey = Symbol(
  '@react-querybuilder/vue:ruleGroup'
) as InjectionKey<RuleGroupInternals>;

/**
 * The subquery group rendered *inside* a rule, when the rule's field supports match modes.
 * Distinct from {@link ruleGroupInternalsKey} because `RuleComponents` needs to know whether it
 * is in subquery mode at all, which a shadowed group key cannot express.
 */
const subQueryInternalsKey = Symbol('@react-querybuilder/vue:subQuery') as InjectionKey<
  RuleGroupInternals | undefined
>;

const makeInternals = <P, R extends object>(
  props: MaybeRefOrGetter<P>,
  parts: R
): Internals<P, R> => ({ props: computed(() => toValue(props)), parts: reactive(parts) });

/** Provides the current rule's props and derived parts. Call from `Rule`'s `setup`. */
export const provideRuleInternals = (
  props: MaybeRefOrGetter<RuleProps>,
  parts: UseRuleReturn
): void => {
  provide(ruleInternalsKey, makeInternals(props, parts));
  // Shadows any enclosing rule's subquery: a rule nested inside a subquery is not itself one.
  // `RuleSubQuery` renders below this and overrides it for its own subtree.
  provide(subQueryInternalsKey, undefined);
};

/** Provides the current group's props and derived parts. Call from `RuleGroup`'s `setup`. */
export const provideRuleGroupInternals = (
  props: MaybeRefOrGetter<RuleGroupProps>,
  parts: UseRuleGroupReturn
): void => {
  provide(ruleGroupInternalsKey, makeInternals(props, parts));
};

/**
 * Provides a rule's subquery group under both the subquery key and the group key — the latter so
 * that the `RuleGroupHeader`/`RuleGroupBody` rendered by `RuleComponents` resolve the subquery's
 * group rather than the enclosing group. Call from `RuleSubQuery`'s `setup`.
 */
export const provideSubQueryInternals = (
  props: MaybeRefOrGetter<RuleGroupProps>,
  parts: UseRuleGroupReturn
): void => {
  const internals = makeInternals(props, parts);
  provide(subQueryInternalsKey, internals);
  provide(ruleGroupInternalsKey, internals);
};

/** @throws if called outside a `Rule`. */
export const useRuleInternals = (): RuleInternals => {
  const internals = inject(ruleInternalsKey);
  if (!internals) {
    throw new Error('[@react-querybuilder/vue] rule internals used outside of `Rule`');
  }
  return internals;
};

/** @throws if called outside a `RuleGroup` or a `RuleSubQuery`. */
export const useRuleGroupInternals = (): RuleGroupInternals => {
  const internals = inject(ruleGroupInternalsKey);
  if (!internals) {
    throw new Error('[@react-querybuilder/vue] group internals used outside of `RuleGroup`');
  }
  return internals;
};

/** The enclosing rule's subquery group, or `undefined` when the rule has no subquery. */
export const useSubQueryInternals = (): RuleGroupInternals | undefined =>
  inject(subQueryInternalsKey, undefined);
