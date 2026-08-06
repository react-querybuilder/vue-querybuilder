# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Repository bootstrap: Bun workspaces, Vite 8 library build with `preserveModules`, `vue-tsc`
  declaration emit, SCSS/CSS build copied from `@react-querybuilder/core`, Vitest 4 + jsdom test
  setup, oxlint/oxfmt, `attw` export checking, and CI.
- Public type layer: props, controls, schema, and translation types, plus `.test-d.ts` type tests.
- Reactivity composables: `useQueryBuilder`, `useRule`, `useRuleGroup`, `useQueryActions`,
  `useValueEditorReset`, and the provide/inject context helpers.
- Default components: `QueryBuilder`, `RuleGroup`, `Rule`, `ActionElement`, `ValueSelector`,
  `ValueEditor`, the internal `Label`, and `defaultControlElements`. `inlineCombinator`,
  `matchModeEditor`, `notToggle`, `shiftActions`, and `undoRedoActions` still resolve to
  `nullComponent` and render nothing.

### Changed (divergences from React Query Builder)

_The authoritative divergence list. Kept current at every step, not at the end._

- **No Redux store.** State lives in a `QueryManager` from `@react-querybuilder/core`. There is no
  `qbId` registry and no `dispatchQuery`; external control is via a `manager` prop.
- **No drag and drop.** `enableDragAndDrop` is not supported; the root element always renders
  `data-dnd="disabled"`.
- **Labels are `LabelNode` (`VNodeChild | string`)**, not `ReactNode`. Titles remain `string`.
- **Components are Vue `Component<P>`**, not `ComponentType<P>`.
- **Query binding adds `v-model:query`** alongside React's `query`/`defaultQuery`/`onQueryChange`.
  Veto callbacks (`onAddRule`, `onRemove`, `onMoveRule`, ...) remain callback props, because Vue
  emits cannot return a value.
- **`Schema` drops `dispatchQuery` and `qbId`** and gains `manager: QueryManager`. It keeps
  `enableDragAndDrop`, which feeds the root `data-dnd` and is always `false`.
- **`QueryBuilderContextProps` omits `enableDragAndDrop` and `preserveQueryStateOnUnmount`.**
- **`Controls['undoRedoActions']` is non-nullable** — the manager always owns history, so an
  implementation always exists.
- **`ReactMouseEvent` → the DOM `MouseEvent`.**
- **Added `Simple*` prop aliases** (`SimpleQueryBuilderProps`, `SimpleRuleProps`, ...) over the
  fully type-parameter-defaulted prop types.
- **`QueryBuilderProps` remains the conditional `RuleGroupType | RuleGroupTypeIC` public type, but
  its body is the separately exported non-conditional `QueryBuilderPropsBase`** — the SFC compiler
  cannot enumerate prop keys through a conditional type.
- **The reactive layer is public API** under Vue-idiomatic names: `useQueryBuilder`, `useRule`,
  `useRuleGroup`, `useQueryActions`, `useRuleContext`, `useRuleGroupContext`,
  `useValueEditorReset`. It does not mirror React's hook surface.
- **Configuration context is `provide`/`inject`** (`provideQueryBuilderContext` /
  `useQueryBuilderContext`, which yields a `ComputedRef` so inherited config stays reactive). It
  carries configuration only; state lives in the manager.
- **`ValueSelector` drives a multi-select through each `<option>`'s `selected`**, not a `value`
  binding, which Vue would stringify. Rendered DOM is unchanged.
- **Not ported:** UI-framework compatibility packages, `expr`/`datetime` UI, async option lists,
  deprecated props and aliases, `ruleGroupHeaderElements`/`ruleGroupBodyElements`, `DragHandle`.

### Known limitations

- **Structural manager options are captured at construction.** Changing `fields`, `operators`,
  `combinators`, `baseField`/`baseOperator`/`baseCombinator`, the boolean flags, `maxLevels`,
  `disabledPaths`, `validator`, or `idGenerator` after mount updates rendering but not the
  manager's own defaults or prepared option lists. Function props are forwarded through closures
  and do stay live. Recreating the manager would discard undo history.
