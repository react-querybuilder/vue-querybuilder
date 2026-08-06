<script setup lang="ts">
import { TestID } from '@react-querybuilder/core';
import { computed } from 'vue';
import { useRule } from '../composables/useRule.js';
import type { RuleProps } from '../types/props.js';

/**
 * Default component for `RuleType` objects.
 *
 * Port of React Query Builder's `Rule`/`RuleComponents` (`Rule.tsx`). Element order and
 * conditional rendering are copied from there; the conformance suite asserts them byte for byte.
 *
 * Milestone A renders the non-subquery form only. Step 5 splits `RuleComponents` out and adds
 * `RuleSubQuery`, which wraps a subquery's group header and body around the action buttons
 * below. The DOM for a rule without a subquery is unchanged by that split.
 */
defineOptions({ name: 'Rule' });

const props = defineProps<RuleProps>();

const {
  ctx,
  disabled,
  classNames,
  outerClassName,
  fieldData,
  valueEditorSeparator,
  hasSubQuery,
  showFieldSelector,
  showValueControls,
  showValueSourceSelector,
  onChangeField,
  onChangeOperator,
  onChangeMatchMode,
  onChangeValueSource,
  onChangeValue,
  cloneRule,
  toggleLockRule,
  toggleMuteRule,
  removeRule,
  shiftRuleUp,
  shiftRuleDown,
} = useRule(() => props);

const schema = computed(() => props.schema);
const rule = computed(() => props.rule);
const translations = computed(() => props.translations);
const controls = computed(() => schema.value.controls);

/** The props every subcomponent of a rule receives. */
const common = computed(() => ({
  level: props.path.length,
  path: props.path,
  disabled: disabled.value,
  context: props.context,
  validation: ctx.value.validationResult,
  schema: schema.value,
  rule: rule.value,
}));

const shiftTitles = computed(() =>
  schema.value.showShiftActions
    ? {
        shiftUp: translations.value.shiftActionUp?.title,
        shiftDown: translations.value.shiftActionDown?.title,
      }
    : undefined
);

const shiftLabels = computed(() =>
  schema.value.showShiftActions
    ? {
        shiftUp: translations.value.shiftActionUp?.label,
        shiftDown: translations.value.shiftActionDown?.label,
      }
    : undefined
);

/**
 * React gates the operator/value controls on the field having been selected. `autoSelectField`
 * means there is no placeholder field, so the gate is always open.
 */
const fieldIsSelected = computed(
  () =>
    schema.value.autoSelectField || rule.value.field !== translations.value.fields?.placeholderName
);
</script>

<template>
  <div
    :data-testid="TestID.rule"
    :class="outerClassName"
    :data-rule-id="props.id"
    :data-level="props.path.length"
    :data-path="JSON.stringify(props.path)">
    <component
      :is="controls.shiftActions"
      v-if="schema.showShiftActions"
      v-bind="common"
      :testID="TestID.shiftActions"
      :titles="shiftTitles"
      :labels="shiftLabels"
      :className="classNames.shiftActions"
      :ruleOrGroup="rule"
      :shiftUp="shiftRuleUp"
      :shiftDown="shiftRuleDown"
      :shiftUpDisabled="props.shiftUpDisabled"
      :shiftDownDisabled="props.shiftDownDisabled" />
    <component
      :is="controls.fieldSelector"
      v-if="showFieldSelector"
      v-bind="common"
      :testID="TestID.fields"
      :options="schema.fields"
      :title="translations.fields?.title"
      :value="rule.field"
      :operator="rule.operator"
      :className="classNames.fields"
      :handleOnChange="onChangeField" />
    <template v-if="fieldIsSelected">
      <component
        :is="controls.matchModeEditor"
        v-if="hasSubQuery"
        v-bind="common"
        :testID="TestID.matchModeEditor"
        :field="rule.field"
        :fieldData="fieldData"
        :title="translations.matchMode?.title"
        :options="ctx.matchModes"
        :thresholdPlaceholder="translations.matchThreshold?.placeholderName"
        :match="rule.match ?? { mode: 'all' }"
        :className="classNames.matchMode"
        :classNames="classNames"
        :handleOnChange="onChangeMatchMode" />
      <template v-else>
        <component
          :is="controls.operatorSelector"
          v-bind="common"
          :testID="TestID.operators"
          :field="rule.field"
          :fieldData="fieldData"
          :title="translations.operators?.title"
          :options="ctx.operators"
          :value="rule.operator"
          :className="classNames.operators"
          :handleOnChange="onChangeOperator" />
        <template v-if="showValueControls">
          <component
            :is="controls.valueSourceSelector"
            v-if="showValueSourceSelector"
            v-bind="common"
            :testID="TestID.valueSourceSelector"
            :field="rule.field"
            :fieldData="fieldData"
            :title="translations.valueSourceSelector?.title"
            :options="ctx.valueSourceOptions"
            :value="rule.valueSource ?? 'value'"
            :className="classNames.valueSource"
            :handleOnChange="onChangeValueSource" />
          <component
            :is="controls.valueEditor"
            v-bind="common"
            :testID="TestID.valueEditor"
            :field="rule.field"
            :fieldData="fieldData"
            :title="translations.value?.title"
            :operator="rule.operator"
            :value="rule.value"
            :valueSource="rule.valueSource ?? 'value'"
            :type="ctx.valueEditorType"
            :inputType="ctx.inputType"
            :values="ctx.values"
            :listsAsArrays="schema.listsAsArrays"
            :parseNumbers="schema.parseNumbers"
            :separator="valueEditorSeparator"
            :className="classNames.value"
            :handleOnChange="onChangeValue" />
        </template>
      </template>
    </template>
    <component
      :is="controls.cloneRuleAction"
      v-if="schema.showCloneButtons"
      v-bind="common"
      :testID="TestID.cloneRule"
      :label="translations.cloneRule?.label"
      :title="translations.cloneRule?.title"
      :className="classNames.cloneRule"
      :ruleOrGroup="rule"
      :handleOnClick="cloneRule" />
    <component
      :is="controls.lockRuleAction"
      v-if="schema.showLockButtons"
      v-bind="common"
      :testID="TestID.lockRule"
      :label="translations.lockRule?.label"
      :title="translations.lockRule?.title"
      :className="classNames.lockRule"
      :ruleOrGroup="rule"
      :handleOnClick="toggleLockRule"
      :disabledTranslation="props.parentDisabled ? undefined : translations.lockRuleDisabled" />
    <component
      :is="controls.muteRuleAction"
      v-if="schema.showMuteButtons"
      v-bind="common"
      :testID="TestID.muteRule"
      :label="rule.muted ? translations.unmuteRule?.label : translations.muteRule?.label"
      :title="rule.muted ? translations.unmuteRule?.title : translations.muteRule?.title"
      :className="classNames.muteRule"
      :ruleOrGroup="rule"
      :handleOnClick="toggleMuteRule" />
    <component
      :is="controls.removeRuleAction"
      v-bind="common"
      :testID="TestID.removeRule"
      :label="translations.removeRule?.label"
      :title="translations.removeRule?.title"
      :className="classNames.removeRule"
      :ruleOrGroup="rule"
      :handleOnClick="removeRule" />
  </div>
</template>
