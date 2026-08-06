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
- `bun run test` / `bun run test:coverage` — Vitest. **Never `bun test`**; that is Bun's builtin
  runner and bypasses Vitest entirely.
- `bun run conformance` — fetch fixtures, then run the DOM-parity suites
- `bun run test:ssr` — Nuxt SSR smoke test (phase gate)
- `bun run check` — `vue-tsc --noEmit`, then fans out to `check:examples`
- `bun run lint`, `bun run fmt`, `bun run fmt:check`
- `bun run check:all` — everything CI runs

## Examples

Both live in `examples/` and are workspace packages named `@vue-querybuilder/example-*`. Root
`check` fans out to them, so an example type error breaks CI.

- **`examples/demo`** (Vite + Vue) aliases the library **source** (`vue-querybuilder` →
  `packages/vue-querybuilder/src/index.ts`) for HMR with no build. It also aliases
  `vue-querybuilder/dist/*.css` to `@react-querybuilder/core/dist/*.css` — byte-identical — so
  `main.ts` writes the same CSS import line a real consumer writes. **The CSS alias must be
  listed first**, or the bare-specifier alias swallows it.
- **`examples/nuxt`** (Nuxt 4) depends on `vue-querybuilder: workspace:*`, i.e. it consumes the
  built `dist`. That is the point: the SSR gate tests the **publishable artifact** — the
  `exports` map, its condition order, the emitted `.d.ts` — not the source tree. **`bun run build`
  must run before `test:ssr`.**

### Nuxt example specifics

- `nitro.preset: 'node'`, which exports a plain Node `listener` from
  `.output/server/index.mjs`. `ssr-smoke-test.ts` serves that on an **ephemeral port** through
  `node:http`. **Never a spawned CLI**: `nuxt preview` can leave an orphan holding the port and
  serving a stale build, which silently poisons the next run.
- Shared modules must be imported via the **`#shared/*` alias**, not a relative path. Nitro
  cannot resolve a relative `../../shared/x` out of a bundled page chunk.
- `check` is `nuxt prepare && nuxt typecheck`. The root `tsconfig.json` is solution-style and
  references the four configs Nuxt generates into `.nuxt/`; those already set
  `skipLibCheck: true`, which this example needs — core's declarations carry type-only imports of
  optional integrations (`json-logic-js`, `drizzle-orm`, `sequelize`, `@tanstack/db`) that a
  consumer is not required to install.
- Vue's SSR escapes text content, so assertions on rendered text must match the escaped form
  (`'` → `&#39;`). `ssr-smoke-test.ts` has an `escapeHtml` helper for this.
- An SSR framework renders an **error page**, not a 500, for many failures — so the smoke test
  greps the HTML for `document is not defined` / `window is not defined` / `ReferenceError` in
  addition to checking the status code.
- Both examples are excluded from `oxfmt` (`ignorePatterns` in `.oxfmtrc.json`).

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
- Template whitespace is safe between elements — Vue's `condense` mode drops a whitespace-only
  text node that contains a newline when it is leading, trailing, or between two elements. It is
  **not** safe next to a `{{ }}` interpolation, which condenses to a single space instead. Render
  every label through `Label` (a component, so it counts as an element) rather than interpolating.
- Every default control sets `inheritAttrs: false`. `Rule`/`RuleGroup` hand each subcomponent a
  common prop bag (`rule`, `rules`, `ruleOrGroup`, `fieldData`, ...) that most of them do not
  declare; without this those land on the DOM as stray attributes React never emits.

### Reactivity

- The query is a `shallowRef`. A deep proxy defeats reference comparisons and is rejected by the manager's Immer deep-freeze.
- Always `toRaw()` a query before handing it to the manager.
- Likewise `toRaw()` the **manager itself** before calling it. `QueryManager` keeps its history in private class fields, which a reactive `Proxy` cannot read through (`Cannot read private member #past`). `schema` is an ordinary computed value in normal use, but Vue Test Utils wraps mount props in `reactive`, and nothing stops a consumer from doing the same.
- An internal component that receives a `useRule`/`useRuleGroup` return object as a **prop** should unwrap it with `reactive()`. Vue auto-unwraps refs only for top-level `setup` bindings, not through a prop, so the template would otherwise need `.value` everywhere. `reactive()` on a container of refs yields each `.value` directly and leaves plain functions alone. Forward the original object, not the proxy, when passing it further down.
- Effects that write back into state use `watch` with an **explicit dependency array** and `flush: 'post'` — never `watchEffect`, whose tracked set changes across branches.
- Never pair `immediate: true` with `flush: 'post'`. Vue runs an immediate callback _synchronously at watch creation_, ignoring the flush setting, which would apply a write before first render and break DOM parity. Defer the mount-time run with `nextTick` instead, guarded by an `onScopeDispose` flag.

### Props

- **Every boolean prop needs an explicit `undefined` default.** Vue casts an omitted `Boolean`
  prop to `false`, which is not the same as "not configured": `autoSelectField`,
  `enableMountQueryChange`, and the `resetOn*` flags all default to `true`, and a stray `false`
  would also override an inherited context value. `QueryBuilder.vue` passes every flag through
  `withDefaults(..., { flag: undefined })`.
- **`defineProps<T>()` cannot take a conditional type.** The SFC compiler enumerates prop keys
  itself and fails with `Unresolvable type: TSConditionalType`. `QueryBuilderProps` stays the
  conditional public type; its body lives in the non-conditional `QueryBuilderPropsBase`, which
  is what the component declares.

### Types

- `ReactNode` → `LabelNode` (`VNodeChild | string`); titles stay `string`.
- `ComponentType<P>` → Vue's `Component<P>`.
- Use `import type` for type-only imports (`verbatimModuleSyntax` is on).
- Relative imports must carry explicit extensions, and the extension must be `.js` (not `.ts`)
  for TS modules. `vue-tsc` copies specifiers into the emitted `.d.ts` verbatim — it does not
  rewrite `.ts` to `.js` — so a `.ts` specifier ships broken to consumers. `check:exports`
  enforces it.
- **No `.vue` specifier may reach `dist`.** `vue-tsc` emits `Foo.vue.d.ts` and copies
  `./Foo.vue` specifiers through, and neither `tsc` nor `vue-tsc` can resolve one of those from a
  published `.d.ts`. `scripts/normalize-sfc-declarations.ts` runs after the d.ts emit, renaming
  `Foo.vue.d.ts` to `Foo.d.ts` (the declaration for the emitted `Foo.js`) and rewriting the
  specifiers to `./Foo.js`. `check:exports` rejects any that survive.
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

Current gates: `fmt:check`, `build`, `check` (library + examples), `check:exports`, `lint`,
`test:coverage` (three thresholds), `conformance` (DOM parity, 232 tests), `test:ssr`.

The SSR gate is proven red by injecting a DOM access (`document.title = '…'`) into
`QueryBuilder.vue`'s `<script setup>`, rebuilding, and confirming HTTP 500 and a non-zero exit.

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
