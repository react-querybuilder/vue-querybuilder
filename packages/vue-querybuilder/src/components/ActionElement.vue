<script setup lang="ts">
import { computed } from 'vue';
import { QueryBuilderLabel } from '../internal/QueryBuilderLabel.js';
import type { ActionProps } from '../types/props.js';

/**
 * Default `<button>` component for every action control.
 *
 * Port of React Query Builder's `ActionElement` (`ActionElement.tsx`).
 */
// `inheritAttrs: false`: `Rule`/`RuleGroup` pass every subcomponent a common set of props
// (`rule`, `rules`, `ruleOrGroup`, ...) that this component does not declare. Without this they
// would fall through onto the `<button>` as stray attributes, which React never emits.
defineOptions({ name: 'ActionElement', inheritAttrs: false });

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
