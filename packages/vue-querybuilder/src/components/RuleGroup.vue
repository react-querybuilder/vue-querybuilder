<script setup lang="ts">
import { TestID } from '@react-querybuilder/core';
import { useRuleGroup } from '../composables/useRuleGroup.js';
import type { RuleGroupProps } from '../types/props.js';
import RuleGroupBody from './RuleGroupBody.vue';
import RuleGroupHeader from './RuleGroupHeader.vue';

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

const props = defineProps<RuleGroupProps>();

const parts = useRuleGroup(() => props);

const { ruleGroup, classNames, outerClassName, accessibleDescription } = parts;
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
      <RuleGroupHeader :groupProps="props" :parts="parts" />
    </div>
    <div :class="classNames.body">
      <RuleGroupBody :groupProps="props" :parts="parts" />
    </div>
  </div>
</template>
