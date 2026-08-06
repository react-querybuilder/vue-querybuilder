<script setup lang="ts">
import { TestID, isRuleGroup } from '@react-querybuilder/core';
import { computed } from 'vue';
import { useRuleGroup } from '../composables/useRuleGroup.js';
import type { RuleGroupProps, RuleProps } from '../types/props.js';

/**
 * Default component for `RuleGroupType` and `RuleGroupTypeIC` objects.
 *
 * Port of React Query Builder's `RuleGroup`, `RuleGroupHeaderComponents`, and
 * `RuleGroupBodyComponents` (`RuleGroup.tsx`), which is read as the spec for element order and
 * conditional rendering rather than translated line by line.
 *
 * Nested groups and rules render through `schema.controls`, so this component never refers to
 * itself and a replacement `ruleGroup`/`rule` component applies at every level. Step 5 extracts
 * the header and body into internal components so that `Rule` can reuse them for a subquery; the
 * DOM is unchanged by that split.
 */
defineOptions({ name: 'RuleGroup' });

const props = defineProps<RuleGroupProps>();

const {
  ruleGroup,
  combinator,
  disabled,
  muted,
  validationResult,
  classNames,
  outerClassName,
  accessibleDescription,
  pathsMemo,
  onCombinatorChange,
  onIndependentCombinatorChange,
  onNotToggleChange,
  addRule,
  addGroup,
  cloneGroup,
  toggleLockGroup,
  toggleMuteGroup,
  removeGroup,
  shiftGroupUp,
  shiftGroupDown,
} = useRuleGroup(() => props);

const schema = computed(() => props.schema);
const translations = computed(() => props.translations);
const controls = computed(() => schema.value.controls);

/** The props every subcomponent of a group receives. */
const common = computed(() => ({
  level: props.path.length,
  path: props.path,
  disabled: disabled.value,
  context: props.context,
  validation: validationResult.value,
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
    ? { undo: classNames.value.undoAction, redo: classNames.value.redoAction }
    : undefined
);

/**
 * Per-child rendering state, in `ruleGroup.rules` order. `key` matches React's: an independent
 * combinator has no `id`, so its path and value stand in for one.
 */
const children = computed(() =>
  ruleGroup.value.rules.map((r, index) => {
    const { path, disabled: pathDisabled } = pathsMemo.value[index];
    const isCombinator = typeof r === 'string';
    const isGroup = !isCombinator && isRuleGroup(r);
    return {
      index,
      path,
      key: isCombinator ? [...path, r].join('-') : r.id,
      isCombinator,
      isGroup,
      id: isCombinator ? undefined : r.id,
      combinator: isCombinator ? r : '',
      group: (isGroup ? r : undefined) as RuleGroupProps['ruleGroup'],
      rule: (isCombinator || isGroup ? undefined : r) as RuleProps['rule'],
      disabled: pathDisabled || (!isCombinator && !!r.disabled),
      shiftUpDisabled: props.path.length === 0 && index === 0,
      shiftDownDisabled: props.path.length === 0 && index === ruleGroup.value.rules.length - 1,
    };
  })
);
</script>

<template>
  <div
    :title="accessibleDescription"
    :class="outerClassName"
    :data-testid="TestID.ruleGroup"
    :data-not="ruleGroup.not ? 'true' : undefined"
    :data-rule-group-id="props.id"
    :data-level="props.path.length"
    :data-path="JSON.stringify(props.path)">
    <div :class="classNames.header">
      <component
        :is="controls.shiftActions"
        v-if="schema.showShiftActions && props.path.length > 0"
        v-bind="common"
        :testID="TestID.shiftActions"
        :titles="shiftTitles"
        :labels="shiftLabels"
        :className="classNames.shiftActions"
        :shiftUp="shiftGroupUp"
        :shiftDown="shiftGroupDown"
        :shiftUpDisabled="props.shiftUpDisabled"
        :shiftDownDisabled="props.shiftDownDisabled"
        :ruleOrGroup="ruleGroup" />
      <component
        :is="controls.combinatorSelector"
        v-if="!schema.showCombinatorsBetweenRules && !schema.independentCombinators"
        v-bind="common"
        :testID="TestID.combinators"
        :options="schema.combinators"
        :value="combinator"
        :title="translations.combinators?.title"
        :className="classNames.combinators"
        :handleOnChange="onCombinatorChange"
        :rules="ruleGroup.rules"
        :ruleGroup="ruleGroup" />
      <component
        :is="controls.notToggle"
        v-if="schema.showNotToggle"
        v-bind="common"
        :testID="TestID.notToggle"
        :className="classNames.notToggle"
        :title="translations.notToggle?.title"
        :label="translations.notToggle?.label"
        :checked="ruleGroup.not"
        :handleOnChange="onNotToggleChange"
        :ruleGroup="ruleGroup" />
      <component
        :is="controls.addRuleAction"
        v-bind="common"
        :testID="TestID.addRule"
        :label="translations.addRule?.label"
        :title="translations.addRule?.title"
        :className="classNames.addRule"
        :handleOnClick="addRule"
        :rules="ruleGroup.rules"
        :ruleOrGroup="ruleGroup" />
      <component
        :is="controls.addGroupAction"
        v-if="schema.maxLevels > props.path.length"
        v-bind="common"
        :testID="TestID.addGroup"
        :label="translations.addGroup?.label"
        :title="translations.addGroup?.title"
        :className="classNames.addGroup"
        :handleOnClick="addGroup"
        :rules="ruleGroup.rules"
        :ruleOrGroup="ruleGroup" />
      <component
        :is="controls.cloneGroupAction"
        v-if="schema.showCloneButtons && props.path.length > 0"
        v-bind="common"
        :testID="TestID.cloneGroup"
        :label="translations.cloneRuleGroup?.label"
        :title="translations.cloneRuleGroup?.title"
        :className="classNames.cloneGroup"
        :handleOnClick="cloneGroup"
        :rules="ruleGroup.rules"
        :ruleOrGroup="ruleGroup" />
      <component
        :is="controls.lockGroupAction"
        v-if="schema.showLockButtons"
        v-bind="common"
        :testID="TestID.lockGroup"
        :label="translations.lockGroup?.label"
        :title="translations.lockGroup?.title"
        :className="classNames.lockGroup"
        :handleOnClick="toggleLockGroup"
        :rules="ruleGroup.rules"
        :disabledTranslation="props.parentDisabled ? undefined : translations.lockGroupDisabled"
        :ruleOrGroup="ruleGroup" />
      <component
        :is="controls.muteGroupAction"
        v-if="schema.showMuteButtons"
        v-bind="common"
        :testID="TestID.muteGroup"
        :label="ruleGroup.muted ? translations.unmuteGroup?.label : translations.muteGroup?.label"
        :title="ruleGroup.muted ? translations.unmuteGroup?.title : translations.muteGroup?.title"
        :className="classNames.muteGroup"
        :handleOnClick="toggleMuteGroup"
        :rules="ruleGroup.rules"
        :ruleOrGroup="ruleGroup" />
      <component
        :is="controls.undoRedoActions"
        v-if="schema.showUndoRedo && props.path.length === 0"
        v-bind="common"
        :testID="TestID.undoRedoActions"
        :titles="undoRedoTitles"
        :labels="undoRedoLabels"
        :className="classNames.undoRedoActions"
        :classNames="undoRedoClassNames"
        :ruleOrGroup="ruleGroup" />
      <component
        :is="controls.removeGroupAction"
        v-if="props.path.length > 0"
        v-bind="common"
        :testID="TestID.removeGroup"
        :label="translations.removeGroup?.label"
        :title="translations.removeGroup?.title"
        :className="classNames.removeGroup"
        :handleOnClick="removeGroup"
        :rules="ruleGroup.rules"
        :ruleOrGroup="ruleGroup" />
    </div>
    <div :class="classNames.body">
      <template v-for="child of children" :key="child.key">
        <component
          :is="controls.inlineCombinator"
          v-if="
            child.index > 0 && !schema.independentCombinators && schema.showCombinatorsBetweenRules
          "
          :options="schema.combinators"
          :value="combinator"
          :title="translations.combinators?.title"
          :className="classNames.combinators"
          :handleOnChange="onCombinatorChange"
          :rules="ruleGroup.rules"
          :level="props.path.length"
          :context="props.context"
          :validation="validationResult"
          :component="controls.combinatorSelector"
          :path="child.path"
          :disabled="disabled"
          :schema="schema"
          :ruleGroup="ruleGroup" />
        <component
          :is="controls.inlineCombinator"
          v-if="child.isCombinator"
          :options="schema.combinators"
          :value="child.combinator"
          :title="translations.combinators?.title"
          :className="classNames.combinators"
          :handleOnChange="(value: string) => onIndependentCombinatorChange(value, child.index)"
          :rules="ruleGroup.rules"
          :level="props.path.length"
          :context="props.context"
          :validation="validationResult"
          :component="controls.combinatorSelector"
          :path="child.path"
          :disabled="child.disabled"
          :schema="schema"
          :ruleGroup="ruleGroup" />
        <component
          :is="controls.ruleGroup"
          v-else-if="child.isGroup"
          :id="child.id"
          :schema="schema"
          :actions="props.actions"
          :path="child.path"
          :translations="translations"
          :ruleGroup="child.group"
          :disabled="child.disabled"
          :parentDisabled="props.parentDisabled || disabled"
          :parentMuted="props.parentMuted || muted"
          :shiftUpDisabled="child.shiftUpDisabled"
          :shiftDownDisabled="child.shiftDownDisabled"
          :context="props.context" />
        <component
          :is="controls.rule"
          v-else
          :id="child.id"
          :rule="child.rule"
          :schema="schema"
          :actions="props.actions"
          :path="child.path"
          :disabled="child.disabled"
          :parentDisabled="props.parentDisabled || disabled"
          :parentMuted="props.parentMuted || muted"
          :translations="translations"
          :shiftUpDisabled="child.shiftUpDisabled"
          :shiftDownDisabled="child.shiftDownDisabled"
          :context="props.context" />
      </template>
    </div>
  </div>
</template>
