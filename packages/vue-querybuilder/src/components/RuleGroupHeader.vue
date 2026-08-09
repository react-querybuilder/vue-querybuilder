<script setup lang="ts">
import { TestID } from '@react-querybuilder/core';
import { computed, reactive } from 'vue';
import type { UseRuleGroupReturn } from '../composables/useRuleGroup.js';
import type { RuleGroupProps } from '../types/props.js';

/**
 * The controls in a rule group's header, without the wrapping `<div>`.
 *
 * Port of React Query Builder's `RuleGroupHeaderComponents` (`RuleGroup.tsx`). Internal rather
 * than a control element — there is no `ruleGroupHeaderElements` control element — and a
 * separate component only so that a rule with a subquery can reuse it.
 */
defineOptions({ name: 'RuleGroupHeader', inheritAttrs: false });

const props = defineProps<{ groupProps: RuleGroupProps; parts: UseRuleGroupReturn }>();

// See `RuleComponents.vue` for why the parts object is unwrapped with `reactive`.
const parts = reactive(props.parts);

const schema = computed(() => props.groupProps.schema);
const translations = computed(() => props.groupProps.translations);
const path = computed(() => props.groupProps.path);
const controls = computed(() => schema.value.controls);

/** The props every subcomponent of a group receives. */
const common = computed(() => ({
  level: path.value.length,
  path: path.value,
  disabled: parts.disabled,
  context: props.groupProps.context,
  validation: parts.validationResult,
  schema: schema.value,
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

const undoRedoTitles = computed(() =>
  schema.value.showUndoRedo
    ? { undo: translations.value.undo?.title, redo: translations.value.redo?.title }
    : undefined
);

const undoRedoLabels = computed(() =>
  schema.value.showUndoRedo
    ? { undo: translations.value.undo?.label, redo: translations.value.redo?.label }
    : undefined
);

const undoRedoClassNames = computed(() =>
  schema.value.showUndoRedo
    ? { undo: parts.classNames.undoAction, redo: parts.classNames.redoAction }
    : undefined
);
</script>

<template>
  <component
    :is="controls.shiftActions"
    v-if="schema.showShiftActions && path.length > 0"
    v-bind="common"
    :testID="TestID.shiftActions"
    :titles="shiftTitles"
    :labels="shiftLabels"
    :className="parts.classNames.shiftActions"
    :shiftUp="parts.shiftGroupUp"
    :shiftDown="parts.shiftGroupDown"
    :shiftUpDisabled="props.groupProps.shiftUpDisabled"
    :shiftDownDisabled="props.groupProps.shiftDownDisabled"
    :ruleOrGroup="parts.ruleGroup" />
  <component
    :is="controls.combinatorSelector"
    v-if="!schema.showCombinatorsBetweenRules && !schema.independentCombinators"
    v-bind="common"
    :testID="TestID.combinators"
    :options="schema.combinators"
    :value="parts.combinator"
    :title="translations.combinators?.title"
    :className="parts.classNames.combinators"
    :handleOnChange="parts.onCombinatorChange"
    :rules="parts.ruleGroup.rules"
    :ruleGroup="parts.ruleGroup" />
  <component
    :is="controls.notToggle"
    v-if="schema.showNotToggle"
    v-bind="common"
    :testID="TestID.notToggle"
    :className="parts.classNames.notToggle"
    :title="translations.notToggle?.title"
    :label="translations.notToggle?.label"
    :checked="parts.ruleGroup.not"
    :handleOnChange="parts.onNotToggleChange"
    :ruleGroup="parts.ruleGroup" />
  <component
    :is="controls.addRuleAction"
    v-bind="common"
    :testID="TestID.addRule"
    :label="translations.addRule?.label"
    :title="translations.addRule?.title"
    :className="parts.classNames.addRule"
    :handleOnClick="parts.addRule"
    :rules="parts.ruleGroup.rules"
    :ruleOrGroup="parts.ruleGroup" />
  <component
    :is="controls.addGroupAction"
    v-if="schema.maxLevels > path.length"
    v-bind="common"
    :testID="TestID.addGroup"
    :label="translations.addGroup?.label"
    :title="translations.addGroup?.title"
    :className="parts.classNames.addGroup"
    :handleOnClick="parts.addGroup"
    :rules="parts.ruleGroup.rules"
    :ruleOrGroup="parts.ruleGroup" />
  <component
    :is="controls.cloneGroupAction"
    v-if="schema.showCloneButtons && path.length > 0"
    v-bind="common"
    :testID="TestID.cloneGroup"
    :label="translations.cloneRuleGroup?.label"
    :title="translations.cloneRuleGroup?.title"
    :className="parts.classNames.cloneGroup"
    :handleOnClick="parts.cloneGroup"
    :rules="parts.ruleGroup.rules"
    :ruleOrGroup="parts.ruleGroup" />
  <component
    :is="controls.lockGroupAction"
    v-if="schema.showLockButtons"
    v-bind="common"
    :testID="TestID.lockGroup"
    :label="translations.lockGroup?.label"
    :title="translations.lockGroup?.title"
    :className="parts.classNames.lockGroup"
    :handleOnClick="parts.toggleLockGroup"
    :rules="parts.ruleGroup.rules"
    :disabledTranslation="
      props.groupProps.parentDisabled ? undefined : translations.lockGroupDisabled
    "
    :ruleOrGroup="parts.ruleGroup" />
  <component
    :is="controls.muteGroupAction"
    v-if="schema.showMuteButtons"
    v-bind="common"
    :testID="TestID.muteGroup"
    :label="parts.ruleGroup.muted ? translations.unmuteGroup?.label : translations.muteGroup?.label"
    :title="parts.ruleGroup.muted ? translations.unmuteGroup?.title : translations.muteGroup?.title"
    :className="parts.classNames.muteGroup"
    :handleOnClick="parts.toggleMuteGroup"
    :rules="parts.ruleGroup.rules"
    :ruleOrGroup="parts.ruleGroup" />
  <component
    :is="controls.undoRedoActions"
    v-if="schema.showUndoRedo && path.length === 0"
    v-bind="common"
    :testID="TestID.undoRedoActions"
    :titles="undoRedoTitles"
    :labels="undoRedoLabels"
    :className="parts.classNames.undoRedoActions"
    :classNames="undoRedoClassNames"
    :ruleOrGroup="parts.ruleGroup" />
  <component
    :is="controls.removeGroupAction"
    v-if="path.length > 0"
    v-bind="common"
    :testID="TestID.removeGroup"
    :label="translations.removeGroup?.label"
    :title="translations.removeGroup?.title"
    :className="parts.classNames.removeGroup"
    :handleOnClick="parts.removeGroup"
    :rules="parts.ruleGroup.rules"
    :ruleOrGroup="parts.ruleGroup" />
</template>
