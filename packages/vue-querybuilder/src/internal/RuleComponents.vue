<script setup lang="ts">
import { TestID } from '@react-querybuilder/core';
import { computed } from 'vue';
import { useRuleInternals, useSubQueryInternals } from './parts.js';
import RuleGroupBody from './RuleGroupBody.vue';
import RuleGroupHeader from './RuleGroupHeader.vue';

/**
 * The controls that make up a rule, without the wrapping `<div>`.
 *
 * Port of React Query Builder's `RuleComponents` (`Rule.tsx`). When the enclosing rule has a
 * subquery — i.e. when `RuleSubQuery.vue` provides one — the subquery's group header and body are
 * rendered in `<div>`s around the rule's own action buttons. That wrapper is React's
 * `RuleWithSubQueryGroupComponentsWrapper`, written out literally here because it is not
 * customizable.
 *
 * This is an internal component, not a control element: it exists only so that a rule with a
 * subquery can reuse it. The DOM for a rule without a subquery is identical either way.
 *
 * Everything it renders from comes through injection — see `parts.ts`.
 */
defineOptions({ name: 'RuleComponents', inheritAttrs: false });

const { props: ruleProps, parts } = useRuleInternals();
// `undefined` unless the enclosing rule has a subquery. `RuleSubQuery` provides the same object
// under the group key, so the `RuleGroupHeader`/`RuleGroupBody` below resolve to this group.
const subQueryParts = useSubQueryInternals()?.parts;

const schema = computed(() => ruleProps.value.schema);
const rule = computed(() => ruleProps.value.rule);
const translations = computed(() => ruleProps.value.translations);
const controls = computed(() => schema.value.controls);

/** The props every subcomponent of a rule receives. */
const common = computed(() => ({
  level: ruleProps.value.path.length,
  path: ruleProps.value.path,
  disabled: parts.disabled,
  context: ruleProps.value.context,
  validation: parts.ctx.validationResult,
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
  <component
    :is="controls.shiftActions"
    v-if="schema.showShiftActions"
    v-bind="common"
    :testID="TestID.shiftActions"
    :titles="shiftTitles"
    :labels="shiftLabels"
    :className="parts.classNames.shiftActions"
    :ruleOrGroup="rule"
    :shiftUp="parts.shiftRuleUp"
    :shiftDown="parts.shiftRuleDown"
    :shiftUpDisabled="ruleProps.shiftUpDisabled"
    :shiftDownDisabled="ruleProps.shiftDownDisabled" />
  <component
    :is="controls.fieldSelector"
    v-if="parts.showFieldSelector"
    v-bind="common"
    :testID="TestID.fields"
    :options="schema.fields"
    :title="translations.fields?.title"
    :value="rule.field"
    :operator="rule.operator"
    :className="parts.classNames.fields"
    :handleOnChange="parts.onChangeField" />
  <template v-if="fieldIsSelected">
    <component
      :is="controls.matchModeEditor"
      v-if="subQueryParts"
      v-bind="common"
      :testID="TestID.matchModeEditor"
      :field="rule.field"
      :fieldData="parts.fieldData"
      :title="translations.matchMode?.title"
      :options="parts.ctx.matchModes"
      :thresholdPlaceholder="translations.matchThreshold?.placeholderName"
      :match="rule.match ?? { mode: 'all' }"
      :className="parts.classNames.matchMode"
      :classNames="parts.classNames"
      :handleOnChange="parts.onChangeMatchMode" />
    <template v-else>
      <component
        :is="controls.operatorSelector"
        v-bind="common"
        :testID="TestID.operators"
        :field="rule.field"
        :fieldData="parts.fieldData"
        :title="translations.operators?.title"
        :options="parts.ctx.operators"
        :value="rule.operator"
        :className="parts.classNames.operators"
        :handleOnChange="parts.onChangeOperator" />
      <template v-if="parts.showValueControls">
        <component
          :is="controls.valueSourceSelector"
          v-if="parts.showValueSourceSelector"
          v-bind="common"
          :testID="TestID.valueSourceSelector"
          :field="rule.field"
          :fieldData="parts.fieldData"
          :title="translations.valueSourceSelector?.title"
          :options="parts.ctx.valueSourceOptions"
          :value="rule.valueSource ?? 'value'"
          :className="parts.classNames.valueSource"
          :handleOnChange="parts.onChangeValueSource" />
        <component
          :is="controls.valueEditor"
          v-bind="common"
          :testID="TestID.valueEditor"
          :field="rule.field"
          :fieldData="parts.fieldData"
          :title="translations.value?.title"
          :operator="rule.operator"
          :value="rule.value"
          :valueSource="rule.valueSource ?? 'value'"
          :type="parts.ctx.valueEditorType"
          :inputType="parts.ctx.inputType"
          :values="parts.ctx.values"
          :listsAsArrays="schema.listsAsArrays"
          :parseNumbers="schema.parseNumbers"
          :separator="parts.valueEditorSeparator"
          :className="parts.classNames.value"
          :handleOnChange="parts.onChangeValue" />
      </template>
    </template>
  </template>
  <div v-if="subQueryParts" :class="subQueryParts.classNames.header">
    <RuleGroupHeader />
  </div>
  <component
    :is="controls.cloneRuleAction"
    v-if="schema.showCloneButtons"
    v-bind="common"
    :testID="TestID.cloneRule"
    :label="translations.cloneRule?.label"
    :title="translations.cloneRule?.title"
    :className="parts.classNames.cloneRule"
    :ruleOrGroup="rule"
    :handleOnClick="parts.cloneRule" />
  <component
    :is="controls.lockRuleAction"
    v-if="schema.showLockButtons"
    v-bind="common"
    :testID="TestID.lockRule"
    :label="translations.lockRule?.label"
    :title="translations.lockRule?.title"
    :className="parts.classNames.lockRule"
    :ruleOrGroup="rule"
    :handleOnClick="parts.toggleLockRule"
    :disabledTranslation="ruleProps.parentDisabled ? undefined : translations.lockRuleDisabled" />
  <component
    :is="controls.muteRuleAction"
    v-if="schema.showMuteButtons"
    v-bind="common"
    :testID="TestID.muteRule"
    :label="rule.muted ? translations.unmuteRule?.label : translations.muteRule?.label"
    :title="rule.muted ? translations.unmuteRule?.title : translations.muteRule?.title"
    :className="parts.classNames.muteRule"
    :ruleOrGroup="rule"
    :handleOnClick="parts.toggleMuteRule" />
  <component
    :is="controls.removeRuleAction"
    v-bind="common"
    :testID="TestID.removeRule"
    :label="translations.removeRule?.label"
    :title="translations.removeRule?.title"
    :className="parts.classNames.removeRule"
    :ruleOrGroup="rule"
    :handleOnClick="parts.removeRule" />
  <div v-if="subQueryParts" :class="subQueryParts.classNames.body">
    <RuleGroupBody />
  </div>
</template>
