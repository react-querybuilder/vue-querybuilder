<script setup lang="ts">
import { ref } from 'vue';
import { QueryBuilder } from 'vue-querybuilder';
import CustomAddRuleAction from '../components/CustomAddRuleAction.vue';
import { fields, query as initialQuery } from '#shared/query';

// `QueryBuilder` is generic in the query type, so this independent-combinators query binds with
// no cast.
const query = ref(initialQuery);

const { data } = await useFetch('/api/sql');
</script>

<template>
  <main>
    <h1>vue-querybuilder — Nuxt SSR</h1>
    <!-- The consumer-supplied control goes through a scoped slot, so the SSR gate exercises
         `slotToComponent`'s server path. -->
    <QueryBuilder v-model:query="query" :fields="fields">
      <template #addRuleAction="props">
        <CustomAddRuleAction v-bind="props" />
      </template>
    </QueryBuilder>
    <pre data-testid="server-sql">{{ data?.sql }}</pre>
  </main>
</template>
