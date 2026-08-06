<script setup lang="ts">
import { Label } from '../internal/Label.js';
import type { ShiftActionsProps } from '../types/props.js';

/**
 * Default "shift up"/"shift down" buttons.
 *
 * Port of React Query Builder's `ShiftActions` (`ShiftActions.tsx`).
 *
 * The click event is forwarded to `shiftUp`/`shiftDown` because `Rule`/`RuleGroup` read
 * `event.altKey` to decide whether to shift the rule/group into or out of the adjacent group.
 */
// `inheritAttrs: false`: see `ActionElement.vue`.
defineOptions({ name: 'ShiftActions', inheritAttrs: false });

const props = defineProps<ShiftActionsProps>();
</script>

<template>
  <div :data-testid="props.testID" :class="props.className">
    <button
      type="button"
      :disabled="props.disabled || props.shiftUpDisabled"
      :title="props.titles?.shiftUp"
      @click="e => props.shiftUp?.(e)">
      <Label :label="props.labels?.shiftUp" />
    </button>
    <button
      type="button"
      :disabled="props.disabled || props.shiftDownDisabled"
      :title="props.titles?.shiftDown"
      @click="e => props.shiftDown?.(e)">
      <Label :label="props.labels?.shiftDown" />
    </button>
  </div>
</template>
