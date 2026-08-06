# vue-querybuilder

Vue 3 component for complex query building. A port of
[React Query Builder](https://react-querybuilder.js.org) built on
[`@react-querybuilder/core`](https://www.npmjs.com/package/@react-querybuilder/core), producing
byte-identical DOM output.

> **Status: pre-release.** Nothing is published yet; `0.1.0` is the first planned release.

## Installation

```bash
npm install vue-querybuilder
```

`vue@^3.5` is a peer dependency. `@react-querybuilder/core` is a regular dependency and is
re-exported in full, so you never need to depend on it directly.

## Quick start

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { formatQuery, QueryBuilder, type Field, type RuleGroupType } from 'vue-querybuilder';
import 'vue-querybuilder/dist/query-builder.css';

const fields: Field[] = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
  { name: 'age', label: 'Age', inputType: 'number' },
];

const query = ref<RuleGroupType>({
  combinator: 'and',
  rules: [{ field: 'firstName', operator: 'beginsWith', value: 'Stev' }],
});
</script>

<template>
  <QueryBuilder v-model:query="query" :fields="fields" />
  <pre>{{ formatQuery(query, 'sql') }}</pre>
</template>
```

## Driving the query

| Approach                      | Use when                                                |
| ----------------------------- | ------------------------------------------------------- |
| `:default-query`              | Uncontrolled; the component owns the query.             |
| `v-model:query`               | Idiomatic two-way binding. Preferred.                   |
| `:query` + `:on-query-change` | Explicit controlled mode.                               |
| `:manager`                    | External control via a `QueryManager` instance you own. |

`v-model:query` is sugar for `:query` plus `@update:query`. `onQueryChange` is a callback **prop**,
not an emit, and fires immediately before `update:query`; the two can be used together.

Veto callbacks — `onAddRule`, `onAddGroup`, `onRemove`, `onMoveRule`, `onMoveGroup`, `onGroupRule`,
`onGroupGroup` — are callback props rather than emits, because a Vue emit cannot return a value
and these must be able to cancel or rewrite the pending change.

External control:

```vue
<script setup lang="ts">
import { QueryManager, QueryBuilder } from 'vue-querybuilder';

const manager = new QueryManager({ combinator: 'and', rules: [] }, { history: true });
const undo = () => manager.undo();
</script>

<template>
  <QueryBuilder :manager="manager" :fields="fields" />
  <button @click="undo">Undo</button>
</template>
```

## Styling

Two prebuilt stylesheets ship in `dist`: `query-builder.css` (full) and
`query-builder-layout.css` (structural only). Both are byte-identical to
`@react-querybuilder/core`'s. The `.scss` sources are published alongside them for
`@use ... with (...)` overrides. See [Styling](./docs/styling.md).

## Documentation

- [Differences from React Query Builder](./docs/differences-from-react-querybuilder.md)
- [Styling](./docs/styling.md)

## Examples

- [`examples/demo`](./examples/demo) — Vite + Vue. Seven field types, standard and
  independent-combinator queries, every display flag, undo/redo, and live `formatQuery` output.
  Aliases the library **source**, so it hot-reloads with no build step.

  ```bash
  bun install && bun --filter @vue-querybuilder/example-demo dev
  ```

- [`examples/nuxt`](./examples/nuxt) — Nuxt 4, server-side rendering. Consumes the built `dist`
  as a workspace dependency and doubles as the project's SSR gate
  ([`ssr-smoke-test.ts`](./examples/nuxt/ssr-smoke-test.ts), run by `bun run test:ssr`).

  ```bash
  bun install && bun run build && bun --filter @vue-querybuilder/example-nuxt dev
  ```

## Non-goals

Drag and drop, UI-framework compatibility packages, `expr`/`datetime` UI, async option lists,
a Redux store, and deprecated-prop fallbacks are all out of scope for v1.

## License

MIT
