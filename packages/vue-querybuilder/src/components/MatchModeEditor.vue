<script setup lang="ts">
import type { FullField, MatchMode, Path, RuleType } from '@react-querybuilder/core';
import { lc, parseNumber } from '@react-querybuilder/core';
import { computed } from 'vue';
import type { MatchModeEditorProps } from '../types/props.js';
import type { Schema } from '../types/schema.js';

/**
 * Default `matchModeEditor` component: a mode selector, plus a numeric threshold editor for the
 * modes that take one (`atleast`/`atmost`/`exactly`).
 *
 * Port of React Query Builder's `MatchModeEditor`/`useMatchModeEditor` (`MatchModeEditor.tsx`).
 * Both controls carry the same `testID`, as upstream does, so tests reach the threshold editor
 * with `getAllByTestId(...)[1]`.
 */
// Attribute fallthrough is on; see `ActionElement.vue`. This component renders two roots, so a
// stray attribute would draw a Vue warning rather than land silently — which is the behavior a
// Vue developer expects, and `controlProps.test.ts` proves none strays.
defineOptions({ name: 'MatchModeEditor' });

const dummyFieldData: FullField = { name: '', value: '', label: '' };
const dummyPath: Path = [];
const requiresThreshold = (mm?: string | null) =>
  ['atleast', 'atmost', 'exactly'].includes(lc(mm) ?? '');

const props = defineProps<MatchModeEditorProps>();

const selectorComponent = computed(
  () => props.selectorComponent ?? props.schema.controls.valueSelector
);
const numericEditorComponent = computed(
  () => props.numericEditorComponent ?? props.schema.controls.valueEditor
);

const thresholdNum = computed(() =>
  typeof props.match.threshold === 'number' ? Math.max(0, props.match.threshold) : 1
);
const thresholdRule = computed<RuleType>(() => ({
  field: '',
  operator: '=',
  value: thresholdNum.value,
}));
const thresholdSchema = computed(
  () => ({ ...props.schema, parseNumbers: true }) as Schema<FullField, string>
);
const thresholdFieldData = computed<FullField>(() =>
  props.thresholdPlaceholder
    ? { ...dummyFieldData, placeholder: props.thresholdPlaceholder }
    : dummyFieldData
);

const showThreshold = computed(() => requiresThreshold(props.match.mode));

/**
 * Selecting a mode that needs a threshold seeds one, so the numeric editor never renders
 * without a value.
 */
const handleChangeMode = (mode: MatchMode) => {
  props.handleOnChange(
    requiresThreshold(mode) && typeof props.match.threshold !== 'number'
      ? { ...props.match, mode, threshold: 1 }
      : { ...props.match, mode }
  );
};

const handleChangeThreshold = (threshold: number) => {
  props.handleOnChange({
    ...props.match,
    threshold: parseNumber(threshold, { parseNumbers: true }),
  });
};
</script>

<template>
  <component
    :is="selectorComponent"
    :schema="props.schema"
    :testID="props.testID"
    :className="props.className"
    :title="props.title"
    :handleOnChange="handleChangeMode"
    :disabled="props.disabled"
    :value="props.match.mode"
    :options="props.options"
    :multiple="false"
    :listsAsArrays="false"
    :path="dummyPath"
    :level="0" />
  <component
    :is="numericEditorComponent"
    v-if="showThreshold"
    skipHook
    :testID="props.testID"
    inputType="number"
    :title="props.title"
    :className="props.className"
    :disabled="props.disabled"
    :handleOnChange="handleChangeThreshold"
    field=""
    operator=""
    :value="thresholdNum"
    valueSource="value"
    :fieldData="thresholdFieldData"
    :schema="thresholdSchema"
    :path="dummyPath"
    :level="0"
    :rule="thresholdRule" />
</template>
