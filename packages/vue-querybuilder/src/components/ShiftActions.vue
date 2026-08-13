<script setup lang="ts">
import { QueryBuilderLabel } from '../internal/QueryBuilderLabel.js';
import type { ShiftActionsProps } from '../types/props.js';

/**
 * Default "shift up"/"shift down" buttons.
 *
 * Port of React Query Builder's `ShiftActions` (`ShiftActions.tsx`).
 *
 * The click event is forwarded to `shiftUp`/`shiftDown` because `Rule`/`RuleGroup` read
 * `event.altKey` to decide whether to shift the rule/group into or out of the adjacent group.
 */
// Attribute fallthrough is on; see `ActionElement.vue`.
defineOptions({ name: 'ShiftActions' });

const props = defineProps<ShiftActionsProps>();
</script>

<template>
  <div :data-testid="props.testID" :class="props.className">
    <button
      type="button"
      :disabled="props.disabled || props.shiftUpDisabled"
      :title="props.titles?.shiftUp"
      @click="e => props.shiftUp?.(e)">
      <QueryBuilderLabel :label="props.labels?.shiftUp" />
    </button>
    <button
      type="button"
      :disabled="props.disabled || props.shiftDownDisabled"
      :title="props.titles?.shiftDown"
      @click="e => props.shiftDown?.(e)">
      <QueryBuilderLabel :label="props.labels?.shiftDown" />
    </button>
  </div>
</template>
