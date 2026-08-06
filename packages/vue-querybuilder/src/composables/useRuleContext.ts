import type {
  FullCombinator,
  FullField,
  FullOperator,
  Path,
  QueryManager,
  RuleContext,
  RuleGroupTypeAny,
} from '@react-querybuilder/core';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { computed, toValue } from 'vue';

/**
 * The resolved {@link RuleContext} for the rule at `path`, recomputed whenever the query
 * identity changes.
 *
 * This is the single-call form of the derivation: `QueryManager.getRuleContext` resolves field
 * data, operators, value editor type, value list, value sources, match modes, and the validation
 * result in one pass. Decomposing it into granular accessors buys nothing unless profiling says
 * otherwise.
 *
 * This is the path-based entry point, intended for external callers. `useRule` deliberately does
 * *not* use it: a rule rendered by a replacement component, or a subquery rule that is not in
 * the manager's query at all, has no resolvable path.
 *
 * @param manager - The manager driving the query.
 * @param path - The rule's path.
 * @param query - The reactive query. Read only to establish a dependency on query identity; the
 * manager holds the authoritative copy.
 */
export const useRuleContext = <F extends FullField = FullField>(
  manager: MaybeRefOrGetter<QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>>,
  path: MaybeRefOrGetter<Path>,
  query: MaybeRefOrGetter<RuleGroupTypeAny>
): ComputedRef<RuleContext<F> | null> =>
  computed(() => {
    // Establishes the dependency on query identity.
    toValue(query);
    return toValue(manager).getRuleContext(toValue(path));
  });
