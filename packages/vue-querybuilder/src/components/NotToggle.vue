<script setup lang="ts">
import { useId } from 'vue';
import { QueryBuilderLabel } from '../internal/QueryBuilderLabel.js';
import type { NotToggleProps } from '../types/props.js';

/**
 * Default `notToggle` (aka inversion) component.
 *
 * Port of React Query Builder's `NotToggle` (`NotToggle.tsx`).
 */
// Attribute fallthrough is on; see `ActionElement.vue`.
defineOptions({ name: 'NotToggle' });

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
      @change="
        e => props.handleOnChange((e.target as HTMLInputElement).checked)
      " /><QueryBuilderLabel :label="props.label"
  /></label>
</template>
