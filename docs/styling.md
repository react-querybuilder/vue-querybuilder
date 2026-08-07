# Styling

`@react-querybuilder/vue` ships the same stylesheets as React Query Builder. They are copied from
`@react-querybuilder/core` at build time and asserted **byte-identical** to core's, so anything
written for React Query Builder's CSS applies unchanged.

## Prebuilt stylesheets

| File                            | Contents                                                        |
| ------------------------------- | --------------------------------------------------------------- |
| `dist/query-builder.css`        | Full theme — layout, borders, colors, branch lines.             |
| `dist/query-builder-layout.css` | Structure only — spacing and flex layout, no colors or borders. |

Import one of them once, anywhere:

```ts
import '@react-querybuilder/vue/dist/query-builder.css';
```

Nuxt:

```ts
export default defineNuxtConfig({
  css: ['@react-querybuilder/vue/dist/query-builder.css'],
});
```

Use `query-builder-layout.css` when you intend to supply your own visual treatment but still want
the component laid out correctly.

## SCSS sources

The `.scss` sources are published alongside the compiled CSS, so you can compile them yourself
with different values:

```scss
@use '@react-querybuilder/vue/dist/query-builder.scss' with (
  $rqb-spacing: 0.75rem,
  $rqb-base-color: #7b2ff7,
  $rqb-border-radius: 0.5rem,
  $rqb-border-style: dashed
);
```

Frequently overridden variables (all declared `!default`, all in
`dist/styles/_variables.scss`):

| Variable                | Default                                                |
| ----------------------- | ------------------------------------------------------ |
| `$rqb-spacing`          | `0.5rem`                                               |
| `$rqb-base-color`       | `#004bb8`                                              |
| `$rqb-background-color` | `color-mix(in srgb, transparent, $rqb-base-color 20%)` |
| `$rqb-border-color`     | `#8081a2`                                              |
| `$rqb-border-style`     | `solid`                                                |
| `$rqb-border-width`     | `1px`                                                  |
| `$rqb-border-radius`    | `0.25rem`                                              |
| `$rqb-branch-color`     | `$rqb-border-color`                                    |
| `$rqb-branch-indent`    | `$rqb-spacing`                                         |
| `$rqb-branch-radius`    | `$rqb-border-radius`                                   |
| `$rqb-branch-style`     | `$rqb-border-style`                                    |
| `$rqb-branch-width`     | `$rqb-border-width`                                    |
| `$rqb-var-prefix`       | `rqb-` — the prefix of the emitted custom properties   |

## CSS custom properties

Every SCSS variable above is also emitted as a CSS custom property on `:root`, so you can
retheme at runtime without recompiling anything:

```
--rqb-spacing
--rqb-base-color
--rqb-background-color
--rqb-border-color
--rqb-border-style
--rqb-border-width
--rqb-border-radius
--rqb-branch-color
--rqb-branch-indent
--rqb-branch-radius
--rqb-branch-style
--rqb-branch-width
```

(The `--rqb-dnd-*` properties are also emitted, but this port does not implement drag and drop,
so they have no effect.)

### Dark theme

```css
@media (prefers-color-scheme: dark) {
  :root {
    --rqb-base-color: #6ea8fe;
    --rqb-border-color: #495057;
    --rqb-background-color: rgb(110 168 254 / 12%);
  }
}
```

Because these are custom properties, a scoped override works too:

```css
.compact-builder {
  --rqb-spacing: 0.25rem;
  --rqb-branch-indent: 0.25rem;
}
```

## Overriding class names

Every element carries a stable class name (`queryBuilder`, `ruleGroup`, `ruleGroup-header`,
`ruleGroup-body`, `ruleGroup-combinators`, `rule`, `rule-fields`, `rule-operators`,
`rule-value`, `rule-remove`, `betweenRules`, …). These are what the stylesheets target, and they
are part of the DOM-parity contract, so they will not change.

Two props adjust them:

- **`controlClassnames`** — adds class names to individual controls, merged with the standard
  ones:

  ```vue
  <QueryBuilder
    :fields="fields"
    :control-classnames="{
      queryBuilder: 'my-builder',
      addRule: 'btn btn-primary',
      removeRule: 'btn btn-danger',
      fields: 'form-select',
      value: 'form-control',
    }" />
  ```

  `controlClassnames` also inherits through `provideQueryBuilderContext()`, and is merged rather
  than replaced when both a prop and an inherited value are present.

- **`suppressStandardClassnames`** — drops the standard class names entirely, leaving only what
  `controlClassnames` supplies. Use this when integrating with a utility-first framework and you
  want no default styling at all. Do **not** import a prebuilt stylesheet in that case.

## Vue-idiomatic overrides

Nothing framework-specific ships in the package; these are patterns, not API.

### Scoped CSS with `:deep()`

Scoped styles add a data attribute to elements rendered by _your_ component, not to a child
component's internals. Reach into the query builder with `:deep()`:

```vue
<style scoped>
.builder-wrapper :deep(.ruleGroup) {
  background: rgb(0 0 0 / 3%);
}

.builder-wrapper :deep(.rule-remove) {
  color: crimson;
}
</style>
```

### CSS modules

```vue
<script setup lang="ts">
import { useCssModule } from 'vue';
const style = useCssModule();
const controlClassnames = { queryBuilder: style.builder };
</script>

<template>
  <QueryBuilder :fields="fields" :control-classnames="controlClassnames" />
</template>

<style module>
.builder {
  font-size: 0.9rem;
}
</style>
```

### Per-instance custom properties

Custom properties cascade, so a `style` binding is the lightest way to theme one instance:

```vue
<template>
  <div :style="{ '--rqb-base-color': accent }">
    <QueryBuilder :fields="fields" v-model:query="query" />
  </div>
</template>
```
