# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-08-06

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
- Conformance harness: `scripts/fetch-fixtures.ts` (pinned to the upstream `v8.22.2` release
  asset, checksum- and `schemaVersion`-verified) plus `test/conformance/`, run separately via
  `bun run conformance`. Asserts full DOM parity — 49 classname cases (byte-identical `class`
  attributes in document order), 49 accessible-description cases, 58 action sequences through a
  bare `QueryManager` and the guard-sensitive subset through the manager `useQueryBuilder` builds
  from props, and a `formatQuery` → `parseSQL` → `formatQuery` round trip over all nine fixture
  queries.
- `examples/demo` — Vite + Vue. Aliases the library source for HMR with no build step, and
  demonstrates seven field types, standard and independent-combinator queries, every display
  flag, undo/redo, and live `formatQuery` output in four formats.
- `examples/nuxt` — Nuxt 4. Depends on `vue-querybuilder: workspace:*`, so it consumes the built
  `dist` and exercises the publishable artifact: the package `exports` map, its condition order,
  and the emitted declarations. Renders a nested independent-combinators query and calls
  `formatQuery` in a Nitro server route.
- SSR gate: `examples/nuxt/ssr-smoke-test.ts`, wired as `bun run test:ssr` and run in CI. Builds
  the example, serves `.output` on an ephemeral port through Nitro's exported Node listener
  (never a spawned CLI), then asserts 14 substrings of the server-rendered HTML — the wrapper
  class, `role`, `data-dnd`, `data-inlinecombinators`, five `data-path` values, three
  `data-testid`s, a consumer-supplied control's label, and the server-side `formatQuery` output —
  and greps for `document is not defined` / `window is not defined` / `ReferenceError`, which an
  SSR framework can render into a 200 response.
- Root `check` fans out to the examples, so an example type error breaks CI.
- Key-named scoped slots: for every key `x` of `controlElements` there is a slot `#x`, receiving
  exactly the props that control element takes. Typed by `ControlSlots`, a mapped type over
  `Controls`, so the slot list and its argument types cannot drift from the components they
  replace. Slots and `controlElements` entries are interchangeable everywhere downstream.
- `QueryBuilderContextProps.slots`, the prop form of the scoped slots, so slots inherit through
  `provide` like every other configuration value.
- Generic components: `QueryBuilder` (`RG`, `F`, `O`, `C`, all defaulted) and `Rule`/`RuleGroup`
  (`F`, `O`), plus the `RuleTypeOf<RG>` helper.
- Accessibility suite: axe over all seven conformance scenarios, run twice per case — WCAG
  2.0/2.1 A+AA must be empty, best-practice must equal exactly `['label-title-only']` — plus
  keyboard tests for rule-row tab order, Enter/Space activation, and not-toggle label
  association.
- Documentation: `README.md`, `docs/differences-from-react-querybuilder.md`,
  `docs/customization.md`, and `docs/styling.md`.

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
- **Slots are the Vue-native customization point and win over `controlElements` at the same
  level.** Per key: levels are tried props → context → defaults, and within a level the order is
  keyed slot → keyed component → bulk slot → bulk component. `controlElements: { x: null }`
  short-circuits at its own level, so it beats an inherited slot. Slot wrappers are cached by
  slot identity, so a re-render never remounts the replaced subtree.
- **`ControlSlots` and `ControlProps` are new types**; Vue exports no `ComponentProps` helper as
  of 3.5, so `ControlProps` recovers a control's props from its `Component<P>`.
- **A generic SFC's props parameter carries an index signature** (`Props & Record<string,
unknown>` in `vue-tsc`'s emit), which matters only when a component is invoked through `h()`.
- **Not ported:** UI-framework compatibility packages, `expr`/`datetime` UI, async option lists,
  deprecated props and aliases, `ruleGroupHeaderElements`/`ruleGroupBodyElements`, `DragHandle`.

### Known limitations

- **`label-title-only` (axe best-practice) fires on every selector and text editor.** React Query
  Builder labels those controls with `title` alone, and full DOM parity is a locked decision, so
  an `aria-label` cannot be added without breaking the conformance harness. It is not a WCAG
  failure — `title` does produce an accessible name — and consumers who need a visible label can
  supply one through `controlElements` or a slot. The a11y suite asserts the best-practice
  violation list equals exactly `['label-title-only']`, so any other regression still fails.

- **Structural manager options are captured at construction.** Changing `fields`, `operators`,
  `combinators`, `baseField`/`baseOperator`/`baseCombinator`, the boolean flags, `maxLevels`,
  `disabledPaths`, `validator`, or `idGenerator` after mount updates rendering but not the
  manager's own defaults or prepared option lists. Function props are forwarded through closures
  and do stay live. Recreating the manager would discard undo history.

[unreleased]: https://github.com/react-querybuilder/vue-querybuilder/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/react-querybuilder/vue-querybuilder/releases/tag/v0.1.0
