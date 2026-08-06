<script setup lang="ts">
import { ref } from 'vue';
import { QueryBuilder, type RuleGroupType } from 'vue-querybuilder';
import CustomAddRuleAction from '../components/CustomAddRuleAction.vue';
import { fields, query as initialQuery } from '#shared/query';

// `QueryBuilder` becomes generic in the query type at step 7; until then its props are declared
// for `RuleGroupType`, so an independent-combinators query needs a cast at the binding.
const query = ref(initialQuery as unknown as RuleGroupType);

// A consumer-supplied control. Step 7 moves this to a `#addRuleAction` slot.
const controlElements = { addRuleAction: CustomAddRuleAction };

const { data } = await useFetch('/api/sql');
</script>

<template>
  <main>
    <h1>vue-querybuilder — Nuxt SSR</h1>
    <QueryBuilder v-model:query="query" :fields="fields" :control-elements="controlElements" />
    <pre data-testid="server-sql">{{ data?.sql }}</pre>
  </main>
</template>
