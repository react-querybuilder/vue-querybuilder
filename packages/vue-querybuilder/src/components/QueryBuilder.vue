<script
  setup
  lang="ts"
  generic="
    RG extends RuleGroupTypeAny = RuleGroupType,
    F extends FullField = FullField,
    O extends FullOperator = FullOperator,
    C extends FullCombinator = FullCombinator
  ">
import type {
  FullCombinator,
  FullField,
  FullOperator,
  GetOptionIdentifierType,
  RuleGroupType,
  RuleGroupTypeAny,
} from '@react-querybuilder/core';
import { rootPath } from '@react-querybuilder/core';
import { computed, useSlots } from 'vue';
import { provideQueryBuilderNode } from '../composables/accessors.js';
import { provideQueryBuilderContext } from '../composables/context.js';
import { useQueryBuilder } from '../composables/useQueryBuilder.js';
import type { ControlSlots } from '../types/controls.js';
import type { QueryBuilderProps, QueryBuilderPropsBase, RuleTypeOf } from '../types/props.js';
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

const props = withDefaults(defineProps<QueryBuilderPropsBase<RG, RuleTypeOf<RG>, F, O, C>>(), {
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
  showUngroupButtons: undefined,
  resetOnFieldChange: undefined,
  resetOnOperatorChange: undefined,
  autoSelectField: undefined,
  autoSelectOperator: undefined,
  autoSelectValue: undefined,
  addRuleToNewGroups: undefined,
  listsAsArrays: undefined,
  suppressStandardClassnames: undefined,
});

// Deliberately a manual prop + emit pair rather than `defineModel('query')`. `defineModel` keeps
// a local shadow value whenever the parent does not bind, and that shadow is a second source of
// truth — which conflicts with `defaultQuery` (uncontrolled) and, more fundamentally, with the
// `QueryManager` that owns the query in every mode. Do not "modernize" this.
const emit = defineEmits<{
  /** Emitted with each committed query, after `onQueryChange`. Enables `v-model:query`. */
  'update:query': [query: RG];
}>();

/**
 * One scoped slot per control element key. The slot props are exactly the props the
 * corresponding component would have received.
 */
defineSlots<ControlSlots<F, GetOptionIdentifierType<O>>>();

const slots = useSlots();

// Slots are folded into the props object rather than passed separately, so that they merge
// through exactly the same path as `controlElements` and are inherited through `provide`. An
// explicitly passed `slots` prop wins over a template slot of the same name.
//
// The cast is generic variance, not a slot-typing gap: `useQueryBuilder` is invoked at
// `RuleGroupTypeAny`/`FullCombinator`, and `QueryManager<RG, F, O, C>` is invariant in `RG`
// (`getQuery(): RG`), so this component's own `RG`/`C` parameters do not flow into it. Dropping
// the cast fails on `manager`; the slot merge itself typechecks.
const getProps = (): QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator> =>
  ({ ...props, slots: { ...slots, ...props.slots } }) as QueryBuilderProps<
    RuleGroupTypeAny,
    F,
    O,
    FullCombinator
  >;

const state = useQueryBuilder<F, O>(getProps, {
  defaultControls: defaultControlElements as never,
  writeBack: query => emit('update:query', query as RG),
});

provideQueryBuilderContext(state.context);

// The `useSchema`/`useQueryBuilderActions` accessors. `Rule`/`RuleGroup` re-provide these at
// every level; this call covers a slot rendered above any rule, and the root group itself.
provideQueryBuilderNode(state.schema, state.actions);

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
