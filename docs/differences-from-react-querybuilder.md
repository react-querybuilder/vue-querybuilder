# Differences from React Query Builder

`vue-querybuilder` is a port, not a rewrite. It renders the same DOM, accepts (nearly) the same
props, and delegates all query logic to the same `@react-querybuilder/core` package that React
Query Builder itself uses. This page lists everything that is not the same.

## 1. Rendered output is identical

The port's defining constraint is **full DOM parity**: tag name, document order, `data-testid`,
`data-path`, and byte-identical `class` attributes match React Query Builder's output.

This is not aspirational. The repository downloads a conformance fixture asset published by the
upstream project (pinned to `v8.22.2`) and asserts, for 49 scenario × query combinations, that the
full ordered list of rendered elements matches byte for byte — plus 49 accessible-description
cases and 58 replayed action sequences. See `packages/vue-querybuilder/test/conformance/`.

**Any undocumented difference in rendered output is a bug.** Please report it.

## 2. Not implemented

None of the following is planned for v1:

- **Drag and drop.** There is no `@react-querybuilder/dnd` equivalent, no `DragHandle`
  component, and no `DragHandleProps`/`UseRuleDnD`/`UseRuleGroupDnD` types. The root element
  always renders `data-dnd="disabled"`.
- **UI-framework compatibility packages** (Ant Design, Bootstrap, Bulma, Chakra, Fluent, Mantine,
  MUI, Tremor).
- **`expr` and `datetime` UI packages.** The core-level functionality is available through the
  re-exported core package; the React components are not ported.
- **Async option lists** (`useAsyncOptionList`).
- **Deprecated props and aliases.** `ActionWithRulesProps` and friends, and the deprecated
  per-prop fallbacks `RuleGroupProps.combinator`/`rules`/`not` and
  `RuleProps.field`/`operator`/`value`/`valueSource`, are all absent. Use `ruleGroup` and `rule`.
- **`ruleGroupHeaderElements` / `ruleGroupBodyElements`.** The equivalent internal components
  exist (`RuleGroupHeader`, `RuleGroupBody`) but are not `controlElements` keys.

## 3. State management

React Query Builder keeps query state in a Redux store, addresses each builder instance by a
`qbId`, and threads a `dispatchQuery` function through `Schema`.

**This port has none of that.** State lives in a `QueryManager` instance from
`@react-querybuilder/core`. Consequently:

- `Schema` drops `dispatchQuery` and `qbId`, and gains `manager: QueryManager`.
- There is no `qbId` registry and no store-level entry point for external control.
- Undo/redo is read directly off `schema.manager`, not off a Redux history slice.

To drive a query builder from outside the component tree, construct the manager yourself and pass
it in:

```vue
<script setup lang="ts">
import { QueryBuilder, QueryManager, formatQuery, type Field } from 'vue-querybuilder';

const fields: Field[] = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
];

// `history: true` is what enables undo/redo. A manager you construct yourself brings its own
// options, so history there is your opt-in — `QueryBuilder` will not add it for you.
const manager = new QueryManager({ combinator: 'and', rules: [] }, { fields, history: true });

const addRule = () => manager.add({ field: 'firstName', operator: '=', value: '' }, []);
const undo = () => manager.undo();
const log = () => console.log(formatQuery(manager.getQuery(), 'sql'));
</script>

<template>
  <QueryBuilder :manager="manager" :fields="fields" />
  <button @click="addRule">Add rule from outside</button>
  <button @click="undo">Undo</button>
  <button @click="log">Log SQL</button>
</template>
```

`QueryManager` keeps its history in private class fields, which a reactive `Proxy` cannot read
through. Do not wrap a manager in `reactive()`; if you must, `toRaw()` it before calling it.

## 4. Query binding

React exposes `query`/`defaultQuery`/`onQueryChange`. This port keeps all three and adds
`v-model:query`.

| Binding                       | Semantics                                                         |
| ----------------------------- | ----------------------------------------------------------------- |
| `:default-query`              | Uncontrolled. The component seeds its manager and owns the query. |
| `v-model:query`               | Two-way. Sugar for `:query` + `@update:query`.                    |
| `:query` + `:on-query-change` | Controlled, React-style.                                          |
| `:manager`                    | The component subscribes to a manager you own.                    |

`update:query` is the **only** emit. Everything else stays a callback prop, for two reasons:

1. **Veto callbacks must return a value.** `onAddRule`, `onAddGroup`, `onRemove`, `onMoveRule`,
   `onMoveGroup`, `onGroupRule`, and `onGroupGroup` can cancel a pending change by returning
   `false`, or replace it by returning a new rule/query. A Vue emit is fire-and-forget, so these
   cannot be emits.
2. **Parity.** Keeping the rest as props means React documentation and examples transfer
   unchanged.

`onQueryChange` fires first, then `update:query`, both exactly once per committed change — even
inside a `manager.batch()`, which produces a single commit.

### Reactivity caveats

- The query is held internally in a `shallowRef`. Queries are immutable and replaced wholesale,
  and the manager deep-freezes them via Immer, so a deep reactive proxy would be both wasteful
  and rejected.
- A parent that holds the query in `reactive()` or spreads it on every change hands back a proxy
  of the object just emitted. The controlled-mode watcher guards against the resulting feedback
  loop with an `Object.is` fast path followed by a `manager.signatureOf()` comparison, so this is
  safe — but a genuine replacement (for example a deep clone) is correctly pushed through.

## 5. Customization

`controlElements` works exactly as in React: a partial map of 24 keys, each a component that
replaces the default. Setting a key to `null` renders nothing for that control.

```vue
<QueryBuilder :fields="fields" :control-elements="{ addRuleAction: MyButton, dragHandle: null }" />
```

Configuration inherits through `provide`/`inject` rather than React context. Call
`provideQueryBuilderContext()` from an ancestor to set `controlElements`, `controlClassnames`,
`translations`, and the display flags for every `QueryBuilder` beneath it; per-instance props win
over inherited values, key by key.

> Key-named scoped slots are an additional customization mechanism. This section is completed when
> they land; see `docs/customization.md`.

## 6. Type-level differences

| React Query Builder                    | This port                                                   |
| -------------------------------------- | ----------------------------------------------------------- |
| `ReactNode` (labels)                   | `LabelNode` = `VNodeChild \| string`. Titles stay `string`. |
| `ComponentType<P>`                     | Vue's `Component<P>`                                        |
| React's synthetic `MouseEvent`         | The DOM `MouseEvent`                                        |
| `Schema.dispatchQuery`, `qbId`         | Removed; `Schema.manager` added                             |
| `Controls['undoRedoActions']` nullable | Non-nullable — the manager always owns history              |

Additional deltas:

- **All four type parameters of `QueryBuilderProps` are defaulted**
  (`RG = RuleGroupType`, `F = FullField`, `O = FullOperator`, `C = FullCombinator`), so the type
  is usable bare.
- **`QueryBuilderProps` is a conditional type; its body is `QueryBuilderPropsBase`.** Vue's SFC
  compiler enumerates prop keys itself and cannot see through a conditional type
  (`Unresolvable type: TSConditionalType`), so the component declares the non-conditional base
  interface. Both are exported. The public conditional type is unchanged in meaning.
- **Convenience aliases** `SimpleQueryBuilderProps`, `SimpleQueryBuilderPropsIC`,
  `SimpleRuleProps`, and `SimpleRuleGroupProps` name the fully-defaulted forms.
- **`QueryBuilderContextProps` omits `enableDragAndDrop` and `preserveQueryStateOnUnmount`.**
  `Schema` still carries `enableDragAndDrop`, because it feeds the root `data-dnd` attribute —
  which is always `"disabled"`.
- **`ValueEditorProps.skipHook` keeps its name** but now refers to the value-editor reset
  _watcher_ rather than a React hook.
- `ControlSlots`, the mapped type over `Controls` that types the scoped slots, arrives with the
  slots themselves.

## 7. Reactivity

React's hooks are not ported. The reactive layer is public API under Vue-idiomatic names:

| Composable                                              | Role                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| `useQueryBuilder`                                       | Manager resolution, query state, schema, actions, derived config  |
| `useQueryActions`                                       | Adapts manager mutators to `QueryActions`; applies veto callbacks |
| `useRule` / `useRuleGroup`                              | Everything a `Rule`/`RuleGroup` implementation needs              |
| `useRuleContext` / `useRuleGroupContext`                | Path-based resolved configuration for external callers            |
| `useValueEditorReset`                                   | The value-editor reset effect                                     |
| `provideQueryBuilderContext` / `useQueryBuilderContext` | Configuration inheritance                                         |

Notes:

- **React's `useMemo` graphs are not reproduced.** The large memo blocks in `Rule.tsx` and
  `RuleGroup.tsx` are a _dependency specification_, not logic: nearly all of the work is done by
  core's `deriveRuleContext`, `deriveRuleGroupContext`, `deriveRuleClassNames`, and
  `derivePathInfo`. Vue's `computed` handles the rest.
- **The value-editor reset watcher uses an explicit dependency array and `flush: 'post'`.**
  `flush: 'post'` matches React's post-commit `useEffect`; core supplies _what_ to reset, not
  _when_. An explicit dependency array (rather than `watchEffect`) removes the auto-tracking
  failure mode where the tracked set changes across branches, which is exactly how such an effect
  loops.
- **`immediate: true` is never paired with `flush: 'post'`.** Vue runs an immediate callback
  synchronously at watch creation, ignoring the flush setting, which would apply a reset before
  first render and diverge from React's post-paint behavior. The mount-time run is deferred with
  `nextTick` instead.
- `useQueryBuilderContext()` returns a `ComputedRef | undefined` — a computed, so inherited
  configuration stays reactive; `undefined` when called outside a component instance.

## 8. Known behavioral notes

- **Structural manager options are captured when the manager is constructed.** Changing `fields`,
  `operators`, `combinators`, `baseField`/`baseOperator`/`baseCombinator`, the boolean flags,
  `maxLevels`, `disabledPaths`, `validator`, or `idGenerator` after mount updates _rendering_ but
  not the manager's own defaults or its prepared option lists. Function props (`getOperators`,
  `getValues`, `getDefaultValue`, …) are forwarded through closures and do stay live.
  Recreating the manager would discard undo history, so this is deliberate.
- **`ValueSelector` drives a multi-select through each `<option>`'s `selected` attribute**, not a
  `value` binding, which Vue would stringify into a cleared selection. Rendered DOM is unchanged.
- **Every default control sets `inheritAttrs: false`.** `Rule` and `RuleGroup` hand each
  subcomponent a common prop bag (`rule`, `rules`, `ruleOrGroup`, `fieldData`, …) that most
  controls do not declare; without this, Vue would land them on the DOM as stray attributes React
  never emits. A custom control should do the same.
- **Every boolean prop is declared with an explicit `undefined` default.** Vue casts an omitted
  `Boolean` prop to `false`, which is not the same as "not configured" — `autoSelectField`,
  `enableMountQueryChange`, and the `resetOn*` flags all default to `true`, and a stray `false`
  would override an inherited context value. If you write a wrapper component around
  `QueryBuilder`, do the same.
- **Vue's Vapor mode is a supported authoring target.** The library uses no render functions that
  assume the virtual DOM, no `$el`, and no manual DOM patching. There is no Vapor CI gate until
  Vue 3.6 is stable.
