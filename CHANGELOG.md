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
  `ValueEditor`, `NotToggle`, `ShiftActions`, `InlineCombinator`, `MatchModeEditor`,
  `UndoRedoActions`, the internal `Label`, and `defaultControlElements`. Every control key now
  resolves to a real component; none maps to `nullComponent`.
- Subquery support: `RuleComponents`, `RuleGroupHeader`, `RuleGroupBody`, and `RuleSubQuery`
  (React's `RuleComponentsWithSubQuery`), with `Rule` and `RuleGroup` reduced to thin wrappers.
  DOM output is unchanged for rules without a subquery.
- Feature coverage: independent combinators, `showCombinatorsBetweenRules`, `showNotToggle`,
  `showShiftActions`, `showCloneButtons`, `showLockButtons`, `showMuteButtons`, match modes and
  subqueries, the `"parameter"` value source, `validator`/`validationMap`,
  `accessibleDescriptionGenerator`, `disabled`/`disabledPaths`, `suppressStandardClassnames`,
  `maxLevels`, and undo/redo.
- Coverage gate over `packages/*/src/**` (90% lines) in the root `vitest.config.ts`.

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
- **Internal split components take `{ ruleProps, parts }` / `{ groupProps, parts }`**, and unwrap
  `parts` with `reactive()`; the original ref-bearing object is what gets forwarded onward.
- **`UndoRedoActions` reads history off `toRaw(schema.manager)`** — no Redux, no `qbId`, no
  separate history entry point. `canUndo`/`canRedo` are wrapped in `computed`s that also touch
  `ruleOrGroup` to establish a dependency.
- **`RuleSubQuery` does not pass `enableDragAndDrop: false`** to the subquery's `useQueryBuilder`;
  the prop would be inert since `data-dnd` is hard-coded to `"disabled"`.
- **Not ported:** UI-framework compatibility packages, `expr`/`datetime` UI, async option lists,
  deprecated props and aliases, `ruleGroupHeaderElements`/`ruleGroupBodyElements`, `DragHandle`.

### Known limitations

- **Structural manager options are captured at construction.** Changing `fields`, `operators`,
  `combinators`, `baseField`/`baseOperator`/`baseCombinator`, the boolean flags, `maxLevels`,
  `disabledPaths`, `validator`, or `idGenerator` after mount updates rendering but not the
  manager's own defaults or prepared option lists. Function props are forwarded through closures
  and do stay live. Recreating the manager would discard undo history.
