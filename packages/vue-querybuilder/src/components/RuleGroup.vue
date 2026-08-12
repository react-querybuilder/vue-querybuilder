<script setup lang="ts" generic="F extends FullOption = FullOption, O extends string = string">
import type { FullOption } from '@react-querybuilder/core';
import { TestID } from '@react-querybuilder/core';
import { provideCurrentRuleGroup, provideQueryBuilderNode } from '../composables/accessors.js';
import { useRuleGroup } from '../composables/useRuleGroup.js';
import { provideRuleGroupInternals } from '../internal/parts.js';
import RuleGroupBody from '../internal/RuleGroupBody.vue';
import RuleGroupHeader from '../internal/RuleGroupHeader.vue';
import type { RuleGroupProps } from '../types/props.js';

/**
 * Default component for `RuleGroupType` and `RuleGroupTypeIC` objects.
 *
 * Port of React Query Builder's `RuleGroup` (`RuleGroup.tsx`). The header and body controls
 * live in `RuleGroupHeader.vue`/`RuleGroupBody.vue`, which are internal components rather than
 * control elements; `RuleComponents` reuses them to render a subquery.
 *
 * Nested groups and rules render through `schema.controls`, so this component never refers to
 * itself and a replacement `ruleGroup`/`rule` component applies at every level.
 */
defineOptions({ name: 'RuleGroup' });

const props = defineProps<RuleGroupProps<F, O>>();

// The component is generic in `F`/`O`, but nothing downstream is: the resolvers on `schema` are
// invariant in their option types. The type parameters are a consumer-facing convenience only,
// so the props are widened to the default instantiation once, here. The cast preserves object
// identity, so the reactive proxy is unchanged.
const widenedProps = props as unknown as RuleGroupProps;

const parts = useRuleGroup(() => widenedProps);

const { ruleGroup, classNames, outerClassName, accessibleDescription } = parts;

// Internal: how `RuleGroupHeader`/`RuleGroupBody` reach everything they render from.
provideRuleGroupInternals(widenedProps, parts);

// Public: the `useSchema`/`useCurrentRuleGroup`/... accessors, for replacement controls. See
// `Rule.vue`.
provideQueryBuilderNode(
  () => widenedProps.schema,
  () => widenedProps.actions
);
provideCurrentRuleGroup(ruleGroup, () => widenedProps.path);
</script>

<template>
  <div
    :title="accessibleDescription"
    :class="outerClassName"
    :data-testid="TestID.ruleGroup"
    :data-not="ruleGroup.not ? 'true' : undefined"
    :data-rule-group-id="props.id"
    :data-level="props.path.length"
    :data-path="JSON.stringify(props.path)">
    <div :class="classNames.header">
      <RuleGroupHeader />
    </div>
    <div :class="classNames.body">
      <RuleGroupBody />
    </div>
  </div>
</template>
