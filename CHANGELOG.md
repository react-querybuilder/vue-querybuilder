# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Repository bootstrap: Bun workspaces, Vite 8 library build with `preserveModules`, `vue-tsc`
  declaration emit, SCSS/CSS build copied from `@react-querybuilder/core`, Vitest 4 + jsdom test
  setup, oxlint/oxfmt, `attw` export checking, and CI.

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
- **Not ported:** UI-framework compatibility packages, `expr`/`datetime` UI, async option lists,
  deprecated props and aliases, `ruleGroupHeaderElements`/`ruleGroupBodyElements`, `DragHandle`.
