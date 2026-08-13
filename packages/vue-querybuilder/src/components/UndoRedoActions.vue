<script setup lang="ts">
import { TestID } from '@react-querybuilder/core';
import { computed } from 'vue';
import type { UndoRedoActionsProps } from '../types/props.js';

/**
 * Default "undo"/"redo" buttons, rendered in the header of the outermost group when the
 * `showUndoRedo` prop is enabled.
 *
 * The `QueryManager` on `schema` owns the history and is constructed with `history: true`, so
 * there is nothing to opt into. An externally supplied `manager` brings its own options, so
 * history there is the caller's opt-in.
 *
 * The buttons themselves render through the `actionElement` control, so a replacement applies
 * here too.
 */
// Attribute fallthrough is on; see `ActionElement.vue`.
defineOptions({ name: 'UndoRedoActions' });

const props = defineProps<UndoRedoActionsProps>();

// No `toRaw`: `QueryManager` is proxy-safe as of `@react-querybuilder/core` 8.23.0, so a
// `schema` that arrived through `reactive()` (Vue Test Utils wraps mount props that way) reads
// its history correctly.
const manager = computed(() => props.schema.manager);
const actionElement = computed(() => props.schema.controls.actionElement);

// `canUndo`/`canRedo` are plain method calls on a stable object, so they carry no reactivity of
// their own. `ruleOrGroup` is the outermost group, replaced on every commit, so reading it is
// what makes these re-evaluate.
const canUndo = computed(() => {
  void props.ruleOrGroup;
  return manager.value.canUndo();
});
const canRedo = computed(() => {
  void props.ruleOrGroup;
  return manager.value.canRedo();
});

const common = computed(() => ({
  level: props.level,
  path: props.path,
  context: props.context,
  validation: props.validation,
  schema: props.schema,
  ruleOrGroup: props.ruleOrGroup,
}));

const undo = () => manager.value.undo();
const redo = () => manager.value.redo();
</script>

<template>
  <div :data-testid="props.testID" :class="props.className">
    <component
      :is="actionElement"
      v-bind="common"
      :testID="TestID.undoAction"
      :label="props.labels?.undo"
      :title="props.titles?.undo"
      :className="props.classNames?.undo"
      :handleOnClick="undo"
      :disabled="props.disabled || !canUndo" />
    <component
      :is="actionElement"
      v-bind="common"
      :testID="TestID.redoAction"
      :label="props.labels?.redo"
      :title="props.titles?.redo"
      :className="props.classNames?.redo"
      :handleOnClick="redo"
      :disabled="props.disabled || !canRedo" />
  </div>
</template>
