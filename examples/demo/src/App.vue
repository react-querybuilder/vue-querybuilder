<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  formatQuery,
  QueryBuilder,
  type Field,
  type RuleGroupType,
  type RuleGroupTypeIC,
} from 'vue-querybuilder';

/** Seven field types, one per value editor the library ships. */
const fields: Field[] = [
  { name: 'firstName', label: 'First Name', placeholder: 'Enter first name' },
  { name: 'age', label: 'Age', inputType: 'number' },
  { name: 'birthdate', label: 'Birthdate', inputType: 'date' },
  {
    name: 'gender',
    label: 'Gender',
    valueEditorType: 'radio',
    values: [
      { name: 'M', label: 'Male' },
      { name: 'F', label: 'Female' },
      { name: 'O', label: 'Other' },
    ],
  },
  {
    name: 'state',
    label: 'State',
    valueEditorType: 'select',
    values: [
      { name: 'CA', label: 'California' },
      { name: 'NY', label: 'New York' },
      { name: 'TX', label: 'Texas' },
    ],
  },
  {
    name: 'groups',
    label: 'Groups',
    valueEditorType: 'multiselect',
    values: [
      { name: 'admin', label: 'Admins' },
      { name: 'staff', label: 'Staff' },
      { name: 'guest', label: 'Guests' },
    ],
  },
  { name: 'bio', label: 'Bio', valueEditorType: 'textarea' },
  { name: 'isActive', label: 'Active', valueEditorType: 'checkbox', defaultValue: false },
];

const query = ref<RuleGroupType>({
  combinator: 'and',
  rules: [
    { field: 'firstName', operator: 'beginsWith', value: 'Stev' },
    { field: 'age', operator: '>', value: 28 },
    {
      combinator: 'or',
      rules: [
        { field: 'state', operator: '=', value: 'CA' },
        { field: 'state', operator: '=', value: 'NY' },
      ],
    },
  ],
});

const queryIC = ref<RuleGroupTypeIC>({
  rules: [
    { field: 'firstName', operator: 'beginsWith', value: 'Stev' },
    'and',
    { field: 'age', operator: '>', value: 28 },
    'or',
    {
      rules: [
        { field: 'state', operator: '=', value: 'CA' },
        'or',
        { field: 'state', operator: '=', value: 'NY' },
      ],
    },
  ],
});

const independentCombinators = ref(false);

// `QueryBuilder` is generic in the query type only from step 7 onward; until then its props are
// declared for `RuleGroupType`, so an independent-combinators query needs a cast at the binding.
const queryICAsAny = computed(() => queryIC.value as unknown as RuleGroupType);
const onQueryICUpdate = (next: RuleGroupType) => {
  queryIC.value = next as unknown as RuleGroupTypeIC;
};

const flags = ref({
  showCombinatorsBetweenRules: false,
  showNotToggle: true,
  showShiftActions: true,
  showCloneButtons: true,
  showLockButtons: true,
  showMuteButtons: true,
  showUndoRedo: true,
  addRuleToNewGroups: false,
  autoSelectField: true,
  autoSelectOperator: true,
  autoSelectValue: true,
  resetOnFieldChange: true,
  resetOnOperatorChange: false,
  listsAsArrays: false,
  suppressStandardClassnames: false,
  parseNumbers: false,
  debugMode: false,
  disabled: false,
});

const flagNames = Object.keys(flags.value) as (keyof typeof flags.value)[];

const formats = ['sql', 'json', 'mongodb', 'cel'] as const;
type DemoFormat = (typeof formats)[number];
const format = ref<DemoFormat>('sql');

const activeQuery = computed(() => (independentCombinators.value ? queryIC.value : query.value));
const output = computed(() => formatQuery(activeQuery.value, format.value));
</script>

<template>
  <h1>vue-querybuilder demo</h1>

  <div class="demo-options">
    <label>
      <input v-model="independentCombinators" type="checkbox" />
      independentCombinators (query shape)
    </label>
    <label v-for="name in flagNames" :key="name">
      <input v-model="flags[name]" type="checkbox" />
      {{ name }}
    </label>
  </div>

  <div class="demo-layout">
    <div>
      <QueryBuilder
        v-if="independentCombinators"
        :fields="fields"
        :query="queryICAsAny"
        v-bind="flags"
        @update:query="onQueryICUpdate" />
      <QueryBuilder v-else v-model:query="query" :fields="fields" v-bind="flags" />
    </div>

    <div class="demo-output">
      <h2>formatQuery</h2>
      <div class="demo-formats">
        <label v-for="f in formats" :key="f">
          <input v-model="format" type="radio" :value="f" />
          {{ f }}
        </label>
      </div>
      <pre>{{ output }}</pre>
      <h2>Query object</h2>
      <pre>{{ JSON.stringify(activeQuery, null, 2) }}</pre>
    </div>
  </div>
</template>
