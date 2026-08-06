<script setup lang="ts">
import type { FullField, FullOption, RuleGroupType } from '@react-querybuilder/core';
import { isRuleGroup, prepareOptionList, rootPath } from '@react-querybuilder/core';
import { computed, reactive } from 'vue';
import { useQueryBuilder } from '../composables/useQueryBuilder.js';
import type { UseRuleReturn } from '../composables/useRule.js';
import { useRuleGroup } from '../composables/useRuleGroup.js';
import type { QueryBuilderProps, RuleGroupProps, RuleProps } from '../types/props.js';
import { defaultControlElements } from './defaultControlElements.js';
import RuleComponents from './RuleComponents.vue';

/**
 * A rule whose field supports match modes (see `getMatchModes`), i.e. one whose `value` is
 * itself a query.
 *
 * Port of React Query Builder's `RuleComponentsWithSubQuery` (`Rule.tsx`). It is a separate
 * component because the subquery needs its own query-builder state, and `useQueryBuilder` can
 * only run during `setup` — so it cannot live behind a `v-if` inside `Rule`.
 *
 * The subquery is fully controlled by `rule.value`: every change is written back through
 * `onChangeValue`.
 */
defineOptions({ name: 'RuleSubQuery', inheritAttrs: false });

const defaultSubproperties: FullOption[] = [{ name: '', value: '', label: '' }];

const props = defineProps<{ ruleProps: RuleProps; parts: UseRuleReturn }>();

// See `RuleComponents.vue` for why the parts object is unwrapped with `reactive`.
const parts = reactive(props.parts);

const schema = computed(() => props.ruleProps.schema);
const rule = computed(() => props.ruleProps.rule);

const subQueryBuilderProps = computed(
  () =>
    schema.value.getSubQueryBuilderProps(rule.value.field as never, {
      fieldData: parts.fieldData as never,
    }) as Record<string, unknown>
);

const subproperties = computed(
  () =>
    prepareOptionList<FullField>({
      placeholder: props.ruleProps.translations.fields as never,
      optionList: (parts.fieldData.subproperties ??
        subQueryBuilderProps.value.fields ??
        defaultSubproperties) as never,
      autoSelectOption: schema.value.autoSelectField || !!parts.fieldData.subproperties,
    }).optionList
);

// Used only until the rule's value becomes a valid group, which happens on the first commit.
// Read once, outside any effect scope, so it is not recreated on every evaluation.
const initialQuery = schema.value.createRuleGroup() as RuleGroupType;

const subQueryProps = computed(
  () =>
    ({
      ...subQueryBuilderProps.value,
      disabled: parts.disabled,
      fields: subproperties.value,
      // Write the value back on first render when it is not already a valid rule group.
      enableMountQueryChange: !isRuleGroup(rule.value.value) || !rule.value.value.id,
      query: isRuleGroup(rule.value.value) ? (rule.value.value as RuleGroupType) : initialQuery,
      onQueryChange: parts.onChangeValue,
    }) as QueryBuilderProps
);

const subState = useQueryBuilder(() => subQueryProps.value as never, {
  defaultControls: defaultControlElements,
});

const subGroupProps = computed(
  () =>
    ({
      id: subState.rootGroup.value.id,
      path: rootPath,
      ruleGroup: subState.rootGroup.value,
      schema: subState.schema.value,
      actions: subState.actions,
      translations: subState.translations.value,
      disabled: parts.disabled,
      parentDisabled: subState.queryDisabled.value,
      shiftUpDisabled: true,
      shiftDownDisabled: true,
      context: props.ruleProps.context,
    }) as RuleGroupProps
);

const subGroupParts = useRuleGroup(() => subGroupProps.value);
</script>

<template>
  <RuleComponents
    :ruleProps="props.ruleProps"
    :parts="props.parts"
    :subQueryProps="subGroupProps"
    :subQueryParts="subGroupParts" />
</template>
