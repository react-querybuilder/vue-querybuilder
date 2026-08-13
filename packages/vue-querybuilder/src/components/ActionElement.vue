<script setup lang="ts">
import { computed } from 'vue';
import { QueryBuilderLabel } from '../internal/QueryBuilderLabel.js';
import type { ActionProps } from '../types/props.js';

/**
 * Default `<button>` component for every action control.
 *
 * Port of React Query Builder's `ActionElement` (`ActionElement.tsx`).
 */
// Attribute fallthrough is on, as a Vue developer expects: a consumer-supplied `class`, `id`,
// or listener lands on the `<button>`. Nothing strays there on its own — `ActionProps` declares
// every prop core's `controlPropKeys` says an action control receives, and the call sites pass
// nothing beyond that. `controlProps.test.ts` gates both halves.
defineOptions({ name: 'ActionElement' });

const props = defineProps<ActionProps>();

/**
 * When a `disabledTranslation` is supplied, a disabled control stays clickable (so that it can
 * be unlocked) and shows the alternate label and title instead.
 */
const useDisabledTranslation = computed(() => !!props.disabledTranslation && !!props.disabled);

const labelToRender = computed(() =>
  useDisabledTranslation.value ? props.disabledTranslation?.label : props.label
);

const titleToRender = computed(() =>
  useDisabledTranslation.value ? props.disabledTranslation?.title : props.title
);
</script>

<template>
  <button
    type="button"
    :data-testid="props.testID"
    :disabled="props.disabled && !props.disabledTranslation"
    :class="props.className"
    :title="titleToRender"
    @click="e => props.handleOnClick(e)">
    <QueryBuilderLabel :label="labelToRender" />
  </button>
</template>
