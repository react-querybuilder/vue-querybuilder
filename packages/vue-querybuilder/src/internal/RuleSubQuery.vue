<script setup lang="ts">
import type { FullField, FullOption, RuleGroupType } from '@react-querybuilder/core';
import { isRuleGroup, prepareOptionList, rootPath } from '@react-querybuilder/core';
import { computed } from 'vue';
import { defaultControlElements } from '../components/defaultControlElements.js';
import { useQueryBuilder } from '../composables/useQueryBuilder.js';
import { useRuleGroup } from '../composables/useRuleGroup.js';
import type { QueryBuilderProps, RuleGroupProps } from '../types/props.js';
import { provideSubQueryInternals, useRuleInternals } from './parts.js';
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

const { props: ruleProps, parts } = useRuleInternals();

const schema = computed(() => ruleProps.value.schema);
const rule = computed(() => ruleProps.value.rule);

const subQueryBuilderProps = computed(
  () =>
    schema.value.getSubQueryBuilderProps(rule.value.field as never, {
      fieldData: parts.fieldData as never,
    }) as Record<string, unknown>
);

const subproperties = computed(
  () =>
    prepareOptionList<FullField>({
      placeholder: ruleProps.value.translations.fields as never,
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
      context: ruleProps.value.context,
    }) as RuleGroupProps
);

const subGroupParts = useRuleGroup(() => subGroupProps.value);

provideSubQueryInternals(subGroupProps, subGroupParts);
</script>

<template>
  <RuleComponents />
</template>
