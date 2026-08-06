<script setup lang="ts">
import { useId } from 'vue';
import { Label } from '../internal/Label.js';
import type { NotToggleProps } from '../types/props.js';

/**
 * Default `notToggle` (aka inversion) component.
 *
 * Port of React Query Builder's `NotToggle` (`NotToggle.tsx`).
 */
// `inheritAttrs: false`: `RuleGroup` passes every subcomponent a common set of props
// (`ruleGroup`, `rules`, ...) that this component does not declare. Without this they would
// fall through onto the `<label>` as stray attributes, which React never emits.
defineOptions({ name: 'NotToggle', inheritAttrs: false });

const props = defineProps<NotToggleProps>();

// React uses `useId()` here, so the association between the label and its checkbox is made the
// same way. The generated value differs from React's, but no conformance assertion reads it.
const id = useId();
</script>

<template>
  <label :data-testid="props.testID" :class="props.className" :title="props.title" :for="id"
    ><input
      :id="id"
      type="checkbox"
      :checked="!!props.checked"
      :disabled="props.disabled"
      @change="e => props.handleOnChange((e.target as HTMLInputElement).checked)" /><Label
      :label="props.label"
  /></label>
</template>
