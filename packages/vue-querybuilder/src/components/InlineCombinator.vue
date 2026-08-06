<script setup lang="ts">
import { TestID, clsx, standardClassnames } from '@react-querybuilder/core';
import { computed } from 'vue';
import type { CombinatorSelectorProps, InlineCombinatorProps } from '../types/props.js';

/**
 * Default `inlineCombinator` component. A small `<div>` wrapper around the `combinatorSelector`
 * component, used when either `showCombinatorsBetweenRules` or independent combinators are in
 * play.
 *
 * Port of React Query Builder's `InlineCombinator` (`InlineCombinator.tsx`).
 */
// `inheritAttrs: false`: see `ActionElement.vue`.
defineOptions({ name: 'InlineCombinator', inheritAttrs: false });

const props = defineProps<InlineCombinatorProps>();

const className = computed(() =>
  clsx(
    props.schema.suppressStandardClassnames || standardClassnames.betweenRules,
    props.schema.classNames.betweenRules
  )
);

/**
 * Everything except `component`, which is this component's own concern. React destructures it
 * out of the spread for the same reason: a replacement `combinatorSelector` should not receive
 * it, and it would otherwise land on the DOM as a stray attribute.
 */
const selectorProps = computed(() => {
  // oxlint-disable-next-line typescript/no-unused-vars
  const { component: _component, ...rest } = props;
  return rest as CombinatorSelectorProps;
});
</script>

<template>
  <div :class="className" :data-testid="TestID.inlineCombinator">
    <component :is="props.component" v-bind="selectorProps" :testID="TestID.combinators" />
  </div>
</template>
