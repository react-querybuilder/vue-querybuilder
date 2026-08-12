<script setup lang="ts">
import type { FullOption } from '@react-querybuilder/core';
import {
  coerceBigIntValue,
  coerceInputType,
  deriveRuleClassName,
  getFirstOption,
  getMultiValueUpdate,
  getParseNumberMethod,
  parseNumber,
  toArray,
} from '@react-querybuilder/core';
import { computed, useId } from 'vue';
import { useValueEditorReset } from '../composables/useValueEditorReset.js';
import { QueryBuilderLabel } from '../internal/QueryBuilderLabel.js';
import type { ValueEditorProps, ValueSelectorProps } from '../types/props.js';

/**
 * Default `valueEditor` component.
 *
 * Port of React Query Builder's `ValueEditor` (`ValueEditor.tsx`). The one piece with a timing
 * hazard — the effect that resets a value when it stops representing a list — lives in
 * `useValueEditorReset`; everything else is a plain derivation.
 */
// See `ActionElement.vue` for why attribute fallthrough is disabled.
defineOptions({ name: 'ValueEditor', inheritAttrs: false });

const props = defineProps<ValueEditorProps>();

/** Stable prefix for radio input ids, so each `<label for>` association is unique. */
const uid = useId();

const type = computed(() => props.type ?? 'text');
const values = computed(() => props.values ?? []);
const placeholderText = computed(() => props.fieldData?.placeholder ?? '');

const selectorComponent = computed(
  () => props.selectorComponent ?? props.schema.controls.valueSelector
);

useValueEditorReset(() => ({
  operator: props.operator,
  value: props.value,
  // `ValueEditorType` includes `null`; the reset helper takes `string | undefined`.
  type: props.type ?? undefined,
  inputType: props.inputType,
  skipHook: props.skipHook,
  handleOnChange: props.handleOnChange,
}));

const valueAsArray = computed(() => toArray(props.value, { retainEmptyStrings: true }));

const parseNumberMethod = computed(() =>
  getParseNumberMethod({ parseNumbers: props.parseNumbers, inputType: props.inputType })
);

const valueListItemClassName = computed(() =>
  deriveRuleClassName('valueListItem', {
    classNames: props.schema.classNames,
    suppressStandardClassnames: props.schema.suppressStandardClassnames,
  })
);

/** The `bigint` branch below is deliberately keyed off the uncoerced `inputType`. */
const inputTypeCoerced = computed(() => coerceInputType(props.inputType, props.operator));

const multiValueHandler = (value: unknown, index: number): void => {
  props.handleOnChange(
    getMultiValueUpdate({
      value,
      index,
      valueAsArray: valueAsArray.value,
      operator: props.operator,
      values: values.value,
      listsAsArrays: props.listsAsArrays,
      parseNumberMethod: parseNumberMethod.value,
    })
  );
};

const bigIntValueHandler = (value: unknown): void => {
  props.handleOnChange(coerceBigIntValue(value, parseNumberMethod.value));
};

/**
 * The props forwarded to the selector component: everything except the props this component
 * consumes itself. Mirrors React's rest-spread of `propsForValueSelector`, which deliberately
 * excludes `testID` — the nested selectors of a `"between"` editor carry no `data-testid`; the
 * `<span>` wrapping them carries it instead.
 */
const propsForValueSelector = computed(
  () =>
    ({
      path: props.path,
      level: props.level,
      context: props.context,
      validation: props.validation,
      schema: props.schema,
      field: props.field,
      fieldData: props.fieldData,
      rule: props.rule,
    }) as unknown as ValueSelectorProps
);

/** Unary operators take no value, so nothing is rendered. */
const isUnary = computed(() => props.operator === 'null' || props.operator === 'notNull');

const isBetween = computed(
  () =>
    (props.operator === 'between' || props.operator === 'notBetween') &&
    (type.value === 'select' || type.value === 'text')
);

const firstOptionOfValues = computed(() => getFirstOption(values.value as FullOption[]));
</script>

<template>
  <template v-if="isUnary" />
  <span
    v-else-if="isBetween"
    :data-testid="props.testID"
    :class="props.className"
    :title="props.title">
    <template v-if="type === 'text'">
      <input
        :type="inputTypeCoerced"
        :placeholder="placeholderText"
        :value="valueAsArray[0] ?? ''"
        :title="props.title"
        :class="valueListItemClassName"
        :disabled="props.disabled"
        @input="e => multiValueHandler((e.target as HTMLInputElement).value, 0)" />
      <QueryBuilderLabel :label="props.separator" />
      <input
        :type="inputTypeCoerced"
        :placeholder="placeholderText"
        :value="valueAsArray[1] ?? ''"
        :title="props.title"
        :class="valueListItemClassName"
        :disabled="props.disabled"
        @input="e => multiValueHandler((e.target as HTMLInputElement).value, 1)" />
    </template>
    <template v-else>
      <component
        :is="selectorComponent"
        v-bind="propsForValueSelector"
        :title="props.title"
        :className="valueListItemClassName"
        :handleOnChange="(v: unknown) => multiValueHandler(v, 0)"
        :disabled="props.disabled"
        :value="valueAsArray[0] ?? firstOptionOfValues"
        :options="values"
        :listsAsArrays="props.listsAsArrays" />
      <QueryBuilderLabel :label="props.separator" />
      <component
        :is="selectorComponent"
        v-bind="propsForValueSelector"
        :title="props.title"
        :className="valueListItemClassName"
        :handleOnChange="(v: unknown) => multiValueHandler(v, 1)"
        :disabled="props.disabled"
        :value="valueAsArray[1] ?? firstOptionOfValues"
        :options="values"
        :listsAsArrays="props.listsAsArrays" />
    </template>
  </span>
  <component
    :is="selectorComponent"
    v-else-if="type === 'select' || type === 'multiselect'"
    v-bind="propsForValueSelector"
    :testID="props.testID"
    :className="props.className"
    :title="props.title"
    :handleOnChange="props.handleOnChange"
    :disabled="props.disabled"
    :value="props.value"
    :options="values"
    :multiple="type === 'multiselect'"
    :listsAsArrays="props.listsAsArrays" />
  <textarea
    v-else-if="type === 'textarea'"
    :data-testid="props.testID"
    :placeholder="placeholderText"
    :value="props.value"
    :title="props.title"
    :class="props.className"
    :disabled="props.disabled"
    @input="e => props.handleOnChange((e.target as HTMLTextAreaElement).value)" />
  <input
    v-else-if="type === 'switch' || type === 'checkbox'"
    :data-testid="props.testID"
    type="checkbox"
    :class="props.className"
    :title="props.title"
    :checked="!!props.value"
    :disabled="props.disabled"
    @change="e => props.handleOnChange((e.target as HTMLInputElement).checked)" />
  <span
    v-else-if="type === 'radio'"
    :data-testid="props.testID"
    :class="props.className"
    :title="props.title">
    <label v-for="v of values" :key="v.name" :for="`${uid}-${v.name}`">
      <input
        :id="`${uid}-${v.name}`"
        type="radio"
        :value="v.name"
        :disabled="props.disabled"
        :checked="props.value === v.name"
        @change="
          e => props.handleOnChange((e.target as HTMLInputElement).value)
        " /><QueryBuilderLabel :label="v.label" />
    </label>
  </span>
  <input
    v-else-if="props.inputType === 'bigint'"
    :data-testid="props.testID"
    :type="inputTypeCoerced"
    :placeholder="placeholderText"
    :value="`${props.value}`"
    :title="props.title"
    :class="props.className"
    :disabled="props.disabled"
    @input="e => bigIntValueHandler((e.target as HTMLInputElement).value)" />
  <input
    v-else
    :data-testid="props.testID"
    :type="inputTypeCoerced"
    :placeholder="placeholderText"
    :value="props.value"
    :title="props.title"
    :class="props.className"
    :disabled="props.disabled"
    @input="
      e =>
        props.handleOnChange(
          parseNumber((e.target as HTMLInputElement).value, {
            parseNumbers: parseNumberMethod,
          })
        )
    " />
</template>
