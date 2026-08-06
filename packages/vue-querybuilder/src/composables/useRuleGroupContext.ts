import type {
  FullCombinator,
  FullField,
  FullOperator,
  Path,
  QueryManager,
  RuleGroupContext,
  RuleGroupTypeAny,
} from '@react-querybuilder/core';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { computed, toValue } from 'vue';

/**
 * The resolved {@link RuleGroupContext} for the group at `path`, recomputed whenever the query
 * identity changes. The single-call counterpart to {@link useRuleContext}, and likewise the
 * path-based entry point for external callers rather than the derivation `useRuleGroup` uses.
 *
 * @param manager - The manager driving the query.
 * @param path - The group's path. The root group's path is `[]`.
 * @param query - The reactive query. Read only to establish a dependency on query identity.
 */
export const useRuleGroupContext = <F extends FullField = FullField>(
  manager: MaybeRefOrGetter<QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>>,
  path: MaybeRefOrGetter<Path>,
  query: MaybeRefOrGetter<RuleGroupTypeAny>
): ComputedRef<RuleGroupContext<FullCombinator> | null> =>
  computed(() => {
    // Establishes the dependency on query identity.
    toValue(query);
    return toValue(manager).getRuleGroupContext(toValue(path));
  });
