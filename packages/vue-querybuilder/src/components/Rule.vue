<script setup lang="ts">
import { TestID } from '@react-querybuilder/core';
import { useRule } from '../composables/useRule.js';
import type { RuleProps } from '../types/props.js';
import RuleComponents from './RuleComponents.vue';
import RuleSubQuery from './RuleSubQuery.vue';

/**
 * Default component for `RuleType` objects.
 *
 * Port of React Query Builder's `Rule` (`Rule.tsx`): a thin wrapper around `RuleComponents`, or
 * around `RuleSubQuery` when the rule's field supports match modes. Element order and
 * conditional rendering live in `RuleComponents.vue`; the conformance suite asserts them byte
 * for byte.
 */
defineOptions({ name: 'Rule' });

const props = defineProps<RuleProps>();

const parts = useRule(() => props);

const { outerClassName, hasSubQuery } = parts;
</script>

<template>
  <div
    :data-testid="TestID.rule"
    :class="outerClassName"
    :data-rule-id="props.id"
    :data-level="props.path.length"
    :data-path="JSON.stringify(props.path)">
    <RuleSubQuery v-if="hasSubQuery" :ruleProps="props" :parts="parts" />
    <RuleComponents v-else :ruleProps="props" :parts="parts" />
  </div>
</template>
