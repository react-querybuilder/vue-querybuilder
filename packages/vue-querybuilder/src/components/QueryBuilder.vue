<script setup lang="ts">
import type { RuleGroupType, RuleGroupTypeAny, RuleType } from '@react-querybuilder/core';
import { rootPath } from '@react-querybuilder/core';
import { computed } from 'vue';
import { provideQueryBuilderContext } from '../composables/context.js';
import { useQueryBuilder } from '../composables/useQueryBuilder.js';
import type { QueryBuilderPropsBase } from '../types/props.js';
import { defaultControlElements } from './defaultControlElements.js';

/**
 * The query builder.
 *
 * Port of React Query Builder's `QueryBuilder`/`QueryBuilderInternal`. All state lives in a
 * `QueryManager` (see `useQueryBuilder`).
 *
 * The query can be driven four ways:
 *
 * - `v-model:query` — two-way binding.
 * - `query` + `onQueryChange` — controlled.
 * - `defaultQuery` — uncontrolled.
 * - a `manager` prop — driven from outside the component tree entirely.
 *
 * Props are declared with {@link QueryBuilderPropsBase} rather than `QueryBuilderProps` because
 * Vue's SFC compiler cannot enumerate the keys of a conditional type. The two are the same type
 * once the rule parameter is resolved.
 *
 * Every boolean flag is given an explicit `undefined` default. Without one, Vue's boolean
 * casting turns an omitted boolean prop into `false`, which is not the same as "not configured":
 * `autoSelectField`, `enableMountQueryChange`, and the `resetOn*` flags all default to `true`,
 * and inherited context values would be overridden by a `false` that the consumer never wrote.
 */
defineOptions({ name: 'QueryBuilder' });

const props = withDefaults(defineProps<QueryBuilderPropsBase<RuleGroupType, RuleType>>(), {
  disabled: undefined,
  parseNumbers: undefined,
  enableMountQueryChange: undefined,
  debugMode: undefined,
  showCombinatorsBetweenRules: undefined,
  showNotToggle: undefined,
  showShiftActions: undefined,
  showUndoRedo: undefined,
  showCloneButtons: undefined,
  showLockButtons: undefined,
  showMuteButtons: undefined,
  resetOnFieldChange: undefined,
  resetOnOperatorChange: undefined,
  autoSelectField: undefined,
  autoSelectOperator: undefined,
  autoSelectValue: undefined,
  addRuleToNewGroups: undefined,
  listsAsArrays: undefined,
  suppressStandardClassnames: undefined,
});

const emit = defineEmits<{
  /** Emitted with each committed query, after `onQueryChange`. Enables `v-model:query`. */
  'update:query': [query: RuleGroupType];
}>();

const state = useQueryBuilder(() => props, {
  defaultControls: defaultControlElements,
  writeBack: query => emit('update:query', query as RuleGroupType),
});

provideQueryBuilderContext(state.context);

const schema = computed(() => state.schema.value);
const rootGroup = computed(() => state.rootGroup.value as RuleGroupTypeAny);
</script>

<template>
  <div
    role="form"
    :class="state.wrapperClassName.value"
    :data-dnd="state.dndEnabledAttr"
    :data-inlinecombinators="state.inlineCombinatorsAttr.value">
    <component
      :is="schema.controls.ruleGroup"
      :translations="state.translations.value"
      :ruleGroup="rootGroup"
      :schema="schema"
      :actions="state.actions"
      :id="rootGroup.id"
      :path="rootPath"
      :disabled="state.rootGroupDisabled.value"
      shiftUpDisabled
      shiftDownDisabled
      :parentDisabled="state.queryDisabled.value"
      :context="props.context" />
  </div>
</template>
