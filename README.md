# vue-querybuilder

Vue 3 component for complex query building. A port of
[React Query Builder](https://react-querybuilder.js.org) built on
[`@react-querybuilder/core`](https://www.npmjs.com/package/@react-querybuilder/core), producing
byte-identical DOM output.

> **Status: pre-release.** The repository is bootstrapped; components land over subsequent steps.
> Nothing is published yet.

## Installation

```bash
npm install vue-querybuilder
```

`vue@^3.5` is a peer dependency.

## Quick start

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { QueryBuilder, type Field, type RuleGroupType } from 'vue-querybuilder';
import 'vue-querybuilder/dist/query-builder.css';

const fields: Field[] = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
];

const query = ref<RuleGroupType>({ combinator: 'and', rules: [] });
</script>

<template>
  <QueryBuilder :fields="fields" v-model:query="query" />
</template>
```

## Driving the query

| Approach                   | Use when                                                |
| -------------------------- | ------------------------------------------------------- |
| `:default-query`           | Uncontrolled; the component owns the query.             |
| `v-model:query`            | Idiomatic two-way binding. Preferred.                   |
| `:query` + `@query-change` | Explicit controlled mode.                               |
| `:manager`                 | External control via a `QueryManager` instance you own. |

## Styling

Two prebuilt stylesheets ship in `dist`: `query-builder.css` (full) and
`query-builder-layout.css` (structural only). Both are byte-identical to
`@react-querybuilder/core`'s. The `.scss` sources are published alongside them for
`@use ... with (...)` overrides.

## Documentation

- [Differences from React Query Builder](./docs/differences-from-react-querybuilder.md)
- [Styling](./docs/styling.md)

## Non-goals

Drag and drop, UI-framework compatibility packages, `expr`/`datetime` UI, async option lists,
a Redux store, and deprecated-prop fallbacks are all out of scope for v1.

## License

MIT
