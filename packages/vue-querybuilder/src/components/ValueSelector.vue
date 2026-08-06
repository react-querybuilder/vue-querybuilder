<script setup lang="ts">
import type { FullOption, OptionGroup } from '@react-querybuilder/core';
import {
  getValueSelectorUpdate,
  isOptionGroupArray,
  normalizeValueSelectorValue,
} from '@react-querybuilder/core';
import { computed } from 'vue';
import type { ValueSelectorProps } from '../types/props.js';

/**
 * Default `<select>` component for every selector control — combinator, field, operator, value
 * source, and list-based value editors.
 *
 * Port of React Query Builder's `ValueSelector` (`ValueSelector.tsx`).
 */
// See `ActionElement.vue` for why attribute fallthrough is disabled.
defineOptions({ name: 'ValueSelector', inheritAttrs: false });

const props = defineProps<ValueSelectorProps>();

const val = computed(() => normalizeValueSelectorValue(props.value, props.multiple));

const optionGroups = computed(() =>
  isOptionGroupArray(props.options) ? (props.options as OptionGroup<FullOption>[]) : null
);

const flatOptions = computed(() =>
  optionGroups.value || !Array.isArray(props.options) ? null : (props.options as FullOption[])
);

/**
 * Vue only manages a `<select>`'s selected options through `v-model`, and `v-model` cannot be
 * used here because the update has to run through `getValueSelectorUpdate`.
 *
 * A single-select is driven by the element's `value`, which Vue sets as a DOM property. That
 * does not work for a multi-select — assigning an array to `select.value` stringifies it and
 * clears the selection — so a multi-select instead drives each `<option>`'s own `selected`
 * state, and the `value` binding is omitted entirely rather than set to `undefined`, which would
 * clobber those options right back.
 */
const valueAttr = computed(() => (props.multiple ? {} : { value: val.value }));

const isSelected = (name: string): boolean | undefined =>
  props.multiple ? (Array.isArray(val.value) ? val.value.includes(name) : false) : undefined;

const onChange = (event: Event): void => {
  const select = event.target as HTMLSelectElement;
  const next = props.multiple ? Array.from(select.selectedOptions, o => o.value) : select.value;
  props.handleOnChange(
    getValueSelectorUpdate(next, {
      multiple: props.multiple,
      listsAsArrays: props.listsAsArrays ?? false,
    })
  );
};
</script>

<template>
  <select
    :data-testid="props.testID"
    :class="props.className"
    v-bind="valueAttr"
    :title="props.title"
    :disabled="props.disabled"
    :multiple="!!props.multiple"
    @change="onChange">
    <template v-if="optionGroups">
      <optgroup v-for="og of optionGroups" :key="og.label" :label="og.label">
        <option
          v-for="opt of og.options"
          :key="opt.name"
          :value="opt.name"
          :disabled="opt.disabled"
          :selected="isSelected(opt.name)">
          {{ opt.label }}
        </option>
      </optgroup>
    </template>
    <template v-else-if="flatOptions">
      <option
        v-for="opt of flatOptions"
        :key="opt.name"
        :value="opt.name"
        :disabled="opt.disabled"
        :selected="isSelected(opt.name)">
        {{ opt.label }}
      </option>
    </template>
  </select>
</template>
