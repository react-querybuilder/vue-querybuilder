# vue-querybuilder Development Guide

**COMMUNICATION STYLE**: Be aggressively concise. Prioritize brevity over grammar.

## Project overview

`vue-querybuilder` is a Vue 3 port of [React Query Builder](https://react-querybuilder.js.org),
built on the published `@react-querybuilder/core`. The port's defining constraint is **full DOM
parity**: tag name, document order, `data-testid`, `data-path`, and byte-identical `class`
attributes must match React Query Builder's output for all conformance cases.

Blueprint: `svelte-querybuilder@0.1.1`. Deviate only where Vue idiom demands.

```
vue-querybuilder/
├── packages/vue-querybuilder/   # the library
│   ├── src/                     # components, composables, types, styles
│   ├── test/conformance/        # DOM-parity harness (fixtures gitignored)
│   └── scripts/                 # build/check helpers
└── examples/                    # demo (Vite) and nuxt (SSR gate)
```

## Commands

- `bun install`
- `bun run build` — vite lib build, then `vue-tsc` d.ts emit, then CSS
- `bun run check` — `vue-tsc --noEmit`
- `bun run test` / `bun run test:coverage` — Vitest. **Never `bun test`**; that is Bun's builtin
  runner and bypasses Vitest entirely.
- `bun run conformance` — fetch fixtures, then run the DOM-parity suites
- `bun run test:ssr` — Nuxt SSR smoke test (phase gate)
- `bun run lint`, `bun run fmt`, `bun run fmt:check`
- `bun run check:all` — everything CI runs

## Authoring constraints

### Vapor compatibility (enforced)

The library must remain compatible with Vue Vapor mode:

- No render functions that assume the virtual DOM.
- No `$el`, no `$refs` traversal, no manual DOM patching.
- No reliance on VDOM-only internals.

There is no Vapor CI gate until Vue 3.6 is stable; the constraint is upheld by review.

### DOM parity

- Build class strings with core's `clsx` exclusively. **Never** template interpolation — it
  introduces whitespace differences.
- `Label` and `slotToComponent` are **functional components, never SFCs**. An SFC emits whitespace
  text nodes, which breaks byte-level parity.
- Element order and conditional rendering are specified by React's `Rule.tsx` / `RuleGroup.tsx`.
  Read them as a spec, not as code to translate.

### Reactivity

- The query is a `shallowRef`. A deep proxy defeats reference comparisons and is rejected by the
  manager's Immer deep-freeze.
- Always `toRaw()` a query before handing it to the manager.
- Effects that write back into state use `watch` with an **explicit dependency array** and
  `flush: 'post'` — never `watchEffect`, whose tracked set changes across branches.
- Never pair `immediate: true` with `flush: 'post'`. Vue runs an immediate callback
  _synchronously at watch creation_, ignoring the flush setting, which would apply a write before
  first render and break DOM parity. Defer the mount-time run with `nextTick` instead, guarded by
  an `onScopeDispose` flag.

### Types

- `ReactNode` → `LabelNode` (`VNodeChild | string`); titles stay `string`.
- `ComponentType<P>` → Vue's `Component<P>`.
- Use `import type` for type-only imports (`verbatimModuleSyntax` is on).
- Relative imports must carry explicit extensions, and the extension must be `.js` (not `.ts`)
  for TS modules. `vue-tsc` copies specifiers into the emitted `.d.ts` verbatim — it does not
  rewrite `.ts` to `.js` — so a `.ts` specifier ships broken to consumers. `check:exports`
  enforces it.
- **TypeScript is pinned to `^5.9`.** `vue-tsc` declares a `>=5.0.0` peer but breaks outright on
  TypeScript 7 (`ERR_PACKAGE_PATH_NOT_EXPORTED` from its internal `require.resolve` of
  `typescript/lib/...`). Do not bump until Volar/`vue-tsc` ship TS 7 support.

### Dependency overrides

`@testing-library/dom` is pinned to `^10.4.1` via a root `overrides` entry.
`@testing-library/jest-dom@7` requires `>=10 <11`, but `@testing-library/vue@8.1.0` still depends
on `^9`. Two copies would be a real hazard — Testing Library's config (`testIdAttribute` and
friends) is per-instance. Drop the override once `@testing-library/vue` moves to dom 10.

## Gates

**Standing rule: every gate must be proven to fail.** When a step adds a gate, deliberately break
it, record that it went red, then revert. A gate that cannot fail is worse than none.

## Coverage

Coverage is configured in the **root** `vitest.config.ts`. A `coverage` block in the package's
`vite.config.ts` is silently ignored when the suite runs through `test.projects`, which is how CI
runs it.

Two thresholds: 80% lines globally, and **90% lines over `packages/*/src/composables/**`** — the
reactive layer is load-bearing and has no DOM to backstop it.

Both were proven red at step 3 (raised to 100, confirmed the error, reverted). The step-1 vacuity
hazard is discharged: `src/` now holds real executable code, so v8 no longer reports `0/0` and the
threshold no longer passes trivially.

Test helpers belong in `packages/vue-querybuilder/test/`, not `src/` — anything under `src/` is
both built into `dist` and counted against coverage.

## Generated / fetched files

- `packages/vue-querybuilder/test/fixtures/` — downloaded by `scripts/fetch-fixtures.ts`,
  gitignored. A fresh clone must pass `bun run test` without them.
