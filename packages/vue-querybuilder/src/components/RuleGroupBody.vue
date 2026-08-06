<script setup lang="ts">
import { isRuleGroup } from '@react-querybuilder/core';
import { computed, reactive } from 'vue';
import type { UseRuleGroupReturn } from '../composables/useRuleGroup.js';
import type { RuleGroupProps, RuleProps } from '../types/props.js';

/**
 * The rules, groups, and inline combinators in a rule group's body, without the wrapping
 * `<div>`.
 *
 * Port of React Query Builder's `RuleGroupBodyComponents` (`RuleGroup.tsx`). See
 * `RuleGroupHeader.vue` for why this is internal rather than a control element.
 *
 * Nested groups and rules render through `schema.controls`, so this component never refers to
 * `RuleGroup` directly and a replacement `ruleGroup`/`rule` component applies at every level.
 */
defineOptions({ name: 'RuleGroupBody', inheritAttrs: false });

const props = defineProps<{ groupProps: RuleGroupProps; parts: UseRuleGroupReturn }>();

// See `RuleComponents.vue` for why the parts object is unwrapped with `reactive`.
const parts = reactive(props.parts);

const schema = computed(() => props.groupProps.schema);
const translations = computed(() => props.groupProps.translations);
const path = computed(() => props.groupProps.path);
const controls = computed(() => schema.value.controls);

/**
 * Per-child rendering state, in `ruleGroup.rules` order. `key` matches React's: an independent
 * combinator has no `id`, so its path and value stand in for one.
 */
const children = computed(() =>
  parts.ruleGroup.rules.map((r, index) => {
    const { path: thisPath, disabled: pathDisabled } = parts.pathsMemo[index];
    const isCombinator = typeof r === 'string';
    const isGroup = !isCombinator && isRuleGroup(r);
    return {
      index,
      path: thisPath,
      key: isCombinator ? [...thisPath, r].join('-') : r.id,
      isCombinator,
      isGroup,
      id: isCombinator ? undefined : r.id,
      combinator: isCombinator ? r : '',
      group: (isGroup ? r : undefined) as RuleGroupProps['ruleGroup'],
      rule: (isCombinator || isGroup ? undefined : r) as RuleProps['rule'],
      disabled: pathDisabled || (!isCombinator && !!r.disabled),
      shiftUpDisabled: path.value.length === 0 && index === 0,
      shiftDownDisabled: path.value.length === 0 && index === parts.ruleGroup.rules.length - 1,
    };
  })
);
</script>

<template>
  <template v-for="child of children" :key="child.key">
    <component
      :is="controls.inlineCombinator"
      v-if="child.index > 0 && !schema.independentCombinators && schema.showCombinatorsBetweenRules"
      :options="schema.combinators"
      :value="parts.combinator"
      :title="translations.combinators?.title"
      :className="parts.classNames.combinators"
      :handleOnChange="parts.onCombinatorChange"
      :rules="parts.ruleGroup.rules"
      :level="path.length"
      :context="props.groupProps.context"
      :validation="parts.validationResult"
      :component="controls.combinatorSelector"
      :path="child.path"
      :disabled="parts.disabled"
      :schema="schema"
      :ruleGroup="parts.ruleGroup" />
    <component
      :is="controls.inlineCombinator"
      v-if="child.isCombinator"
      :options="schema.combinators"
      :value="child.combinator"
      :title="translations.combinators?.title"
      :className="parts.classNames.combinators"
      :handleOnChange="(value: string) => parts.onIndependentCombinatorChange(value, child.index)"
      :rules="parts.ruleGroup.rules"
      :level="path.length"
      :context="props.groupProps.context"
      :validation="parts.validationResult"
      :component="controls.combinatorSelector"
      :path="child.path"
      :disabled="child.disabled"
      :schema="schema"
      :ruleGroup="parts.ruleGroup" />
    <component
      :is="controls.ruleGroup"
      v-else-if="child.isGroup"
      :id="child.id"
      :schema="schema"
      :actions="props.groupProps.actions"
      :path="child.path"
      :translations="translations"
      :ruleGroup="child.group"
      :disabled="child.disabled"
      :parentDisabled="props.groupProps.parentDisabled || parts.disabled"
      :parentMuted="props.groupProps.parentMuted || parts.muted"
      :shiftUpDisabled="child.shiftUpDisabled"
      :shiftDownDisabled="child.shiftDownDisabled"
      :context="props.groupProps.context" />
    <component
      :is="controls.rule"
      v-else
      :id="child.id"
      :rule="child.rule"
      :schema="schema"
      :actions="props.groupProps.actions"
      :path="child.path"
      :disabled="child.disabled"
      :parentDisabled="props.groupProps.parentDisabled || parts.disabled"
      :parentMuted="props.groupProps.parentMuted || parts.muted"
      :translations="translations"
      :shiftUpDisabled="child.shiftUpDisabled"
      :shiftDownDisabled="child.shiftDownDisabled"
      :context="props.groupProps.context" />
  </template>
</template>
