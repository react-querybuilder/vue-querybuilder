<script setup lang="ts" generic="F extends string = string, O extends string = string">
import { TestID } from '@react-querybuilder/core';
import { provideCurrentRule, provideQueryBuilderNode } from '../composables/accessors.js';
import { useRule } from '../composables/useRule.js';
import { provideRuleInternals } from '../internal/parts.js';
import RuleComponents from '../internal/RuleComponents.vue';
import RuleSubQuery from '../internal/RuleSubQuery.vue';
import type { RuleProps } from '../types/props.js';

/**
 * Default component for `RuleType` objects.
 *
 * Port of React Query Builder's `Rule` (`Rule.tsx`): a thin wrapper around `RuleComponents`, or
 * around `RuleSubQuery` when the rule's field supports match modes. Element order and
 * conditional rendering live in `RuleComponents.vue`; the conformance suite asserts them byte
 * for byte.
 */
defineOptions({ name: 'Rule' });

const props = defineProps<RuleProps<F, O>>();

// The component is generic in `F`/`O`, but nothing downstream is: the resolvers on `schema` are
// invariant in their option types. The type parameters are a consumer-facing convenience only,
// so the props are widened to the default instantiation once, here. The cast preserves object
// identity, so the reactive proxy is unchanged.
const widenedProps = props as unknown as RuleProps;

const parts = useRule(() => widenedProps);

const { outerClassName, hasSubQuery } = parts;

// Internal: how `RuleComponents`/`RuleSubQuery` reach everything they render from.
provideRuleInternals(widenedProps, parts);

// Public: the `useSchema`/`useCurrentRule`/... accessors, for replacement controls. Re-provided
// at every level so that a subquery's descendants see the subquery's own schema and actions.
provideQueryBuilderNode(
  () => widenedProps.schema,
  () => widenedProps.actions
);
provideCurrentRule(
  () => widenedProps.rule,
  () => widenedProps.path
);
</script>

<template>
  <div
    :data-testid="TestID.rule"
    :class="outerClassName"
    :data-rule-id="props.id"
    :data-level="props.path.length"
    :data-path="JSON.stringify(props.path)">
    <RuleSubQuery v-if="hasSubQuery" />
    <RuleComponents v-else />
  </div>
</template>
