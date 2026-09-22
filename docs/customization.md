# Customization

Every part of the rendered tree can be replaced. There are three levels, in order of increasing
reach:

1. **Translations** — change the text (or markup) of a label or tooltip.
2. **Slots and `controlElements`** — replace an individual control.
3. **Context** — apply either of the above to every query builder in a subtree.

A replacement control reads what it needs either from its props or by injection; see
[Props for parity, inject for ergonomics](#props-for-parity-inject-for-ergonomics).

Before replacing a component, check whether [styling](./styling.md) gets you there.

## Translations

`translations` overrides the text of every label, title, and placeholder. Labels are typed
`LabelNode = VNodeChild | string`, so any label can be either plain text or arbitrary renderable
Vue content:

```vue
<script setup lang="ts">
import { h, ref } from 'vue';
import { QueryBuilder } from '@react-querybuilder/vue';

const query = ref({ combinator: 'and', rules: [] });
const translations = {
  addRule: {
    label: () => [h('span', { 'aria-hidden': 'true' }, '＋'), ' Add rule'],
    title: 'Add a rule to this group',
  },
  fields: { placeholderLabel: 'Choose a field…' },
};
</script>

<template>
  <QueryBuilder :fields="fields" v-model:query="query" :translations="translations" />
</template>
```

Titles are plain strings — they end up in a `title` attribute, which cannot hold markup.

## Replacing a control

Each control has two interchangeable customization points: a scoped slot and a `controlElements`
entry.

### Slots

For every key `x` of `controlElements` there is a slot `#x`. Its slot props are the props object
the default component would have received.

```vue
<QueryBuilder :fields="fields" v-model:query="query">
  <template #valueEditor="props">
    <input
      :class="props.className"
      :value="props.value"
      :disabled="props.disabled"
      @input="props.handleOnChange(($event.target as HTMLInputElement).value)" />
  </template>
</QueryBuilder>
```

Slots are the better fit when the replacement is small, needs values from the surrounding scope,
or is only used once. They are fully typed: the slot props come from a mapped type over the
control components, so `props` above is a `ValueEditorProps`.

### `controlElements`

Pass a component instead. Better fit when the replacement is reusable or needs its own state:

```vue
<script setup lang="ts">
import MyValueEditor from './MyValueEditor.vue';
</script>

<template>
  <QueryBuilder
    :fields="fields"
    v-model:query="query"
    :control-elements="{ valueEditor: MyValueEditor }" />
</template>
```

Passing `null` renders nothing:

```vue
<QueryBuilder :fields="fields" v-model:query="query" :control-elements="{ lockRuleAction: null }" />
```

There is no `null` form for a slot — omit the slot to fall through to the next source, or use
`controlElements` to suppress the control.

### Bulk overrides

`actionElement` — the slot or the `controlElements` key — replaces every button-type control at
once (`addRuleAction`, `removeGroupAction`, `shiftActions`, …), and `valueSelector` replaces every
`<select>`-type control (`fieldSelector`, `operatorSelector`, `combinatorSelector`,
`valueSourceSelector`). Neither applies to `valueEditor`, `rule`, `ruleGroup`,
`inlineCombinator`, `notToggle`, or `matchModeEditor`.

```vue
<QueryBuilder :fields="fields" v-model:query="query">
  <template #actionElement="{ label, title, className, disabled, handleOnClick }">
    <button type="button" :class="className" :title="title" :disabled="disabled" @click="handleOnClick()">
      {{ label }}
    </button>
  </template>
</QueryBuilder>
```

## Resolution order

Each control key is resolved independently. Levels are tried in order — props, then inherited
context, then the package defaults — and within a level:

1. the keyed slot (`#valueEditor`)
2. the keyed component (`controlElements.valueEditor`), where `null` means "render nothing" and
   stops the search
3. the bulk slot (`#valueSelector`)
4. the bulk component (`controlElements.valueSelector`)

So a slot passed to `QueryBuilder` beats a component passed to `QueryBuilder`, which beats
anything inherited from context, which beats the default. Note the corollary: a component passed
directly to `QueryBuilder` beats a slot supplied by an outer context provider, because levels are
tried before sources within a level.

Slot identity determines component identity, so a slot is wrapped once and cached. Re-renders of
the parent do not remount the replaced subtree.

## Applying customization to a subtree

Context carries configuration — `controlElements`, `slots`, `controlClassnames`, `translations`,
and the boolean flags — down to every query builder below it, including the subquery builders
that match modes create.

```vue
<script setup lang="ts">
import { provideQueryBuilderContext } from '@react-querybuilder/vue';
import MyValueEditor from './MyValueEditor.vue';

provideQueryBuilderContext({
  controlElements: { valueEditor: MyValueEditor },
  translations: { addRule: { label: 'Add' } },
  showNotToggle: true,
});
</script>
```

`provideQueryBuilderContext` accepts a value, a ref, or a getter, so anything that has to stay
reactive can be passed as a getter:

```ts
provideQueryBuilderContext(() => ({ showNotToggle: showNotToggle.value }));
```

To provide slots through context, forward them explicitly — `slots` is the prop form of the
scoped slots:

```vue
<script setup lang="ts">
import { useSlots } from 'vue';
import { provideQueryBuilderContext } from '@react-querybuilder/vue';

const slots = useSlots();
provideQueryBuilderContext(() => ({ slots: { valueEditor: slots.valueEditor } }));
</script>
```

Props always win over context, per key.

## Writing a replacement component

Replacement components receive the same props the default does; the types are exported from the
package barrel:

```vue
<!-- MyValueEditor.vue -->
<script setup lang="ts">
import type { ValueEditorProps } from '@react-querybuilder/vue';

const props = defineProps<ValueEditorProps>();
</script>

<template>
  <input
    :data-testid="props.testID"
    :class="props.className"
    :title="props.title"
    :value="props.value"
    :disabled="props.disabled"
    @input="props.handleOnChange(($event.target as HTMLInputElement).value)" />
</template>
```

Declaring the full props type is enough: `Rule` and `RuleGroup` pass exactly the props each
control's type lists, so nothing is left over to fall through, and normal Vue attribute
fallthrough stays available for whatever a consumer of _your_ component passes. If you declare
only a subset of the props, set `inheritAttrs: false` so the rest do not land on the DOM as
stray attributes.

Keep `data-testid`, `class`, and `title` if you want the standard stylesheets — and any tests
written against the standard DOM — to keep working.

#### Declaring props by control key

The named props types (`ValueEditorProps`, `ActionProps`, …) are the direct route. When you would
rather name the _control key_ — the key you pass to `controlElements` or use as a slot name —
`ControlProps<K>` maps a key to the props that key receives, so a replacement cannot drift from
what the rendering parent actually passes:

```ts
import type { ControlProps } from '@react-querybuilder/vue';

// Equivalent to `ValueEditorProps`.
defineProps<ControlProps<'valueEditor'>>();

// Or just the props you use. Set `inheritAttrs: false` when declaring a subset.
defineProps<Pick<ControlProps<'valueEditor'>, 'value' | 'handleOnChange'>>();
```

`K` is constrained to the control keys this port renders, so a typo or a drag-and-drop key
(`dragHandle`, a non-goal here) is a compile error. The field and option-name type parameters
default to `FullField`/`string` and can be narrowed:
`ControlProps<'valueEditor', MyField, MyOperatorName>`.

### Props for parity, inject for ergonomics

The prop bag is the contract with React Query Builder, and it does not change: a component ported
straight from React Query Builder keeps working. But reaching `schema`, `actions`, `path`, and
the current node through props means declaring roughly ten props you may not otherwise want, so
the same values are also available by injection:

| Accessor                   | Equivalent prop                                  |
| -------------------------- | ------------------------------------------------ |
| `useSchema()`              | `schema`                                         |
| `useQueryBuilderActions()` | `actions`                                        |
| `useCurrentRule()`         | `rule` — the rule the control is rendered inside |
| `useCurrentRuleGroup()`    | the group the control is rendered inside         |
| `useCurrentPath()`         | `path`                                           |

Each returns a `ComputedRef`, or `undefined` when there is no `QueryBuilder` above the call site.
Each is also safe to call outside a component instance, where it likewise returns `undefined`.

```vue
<!-- A "clear this rule" button that declares no props at all. -->
<script setup lang="ts">
import { useCurrentPath, useQueryBuilderActions } from '@react-querybuilder/vue';

const actions = useQueryBuilderActions();
const path = useCurrentPath();
</script>

<template>
  <button type="button" @click="actions?.value.onPropChange('value', '', path!.value)">
    Clear
  </button>
</template>
```

`useCurrentRule` and `useCurrentRuleGroup` resolve the _nearest_ enclosing node, and only one of
them is ever defined at a time. Inside a subquery, all five accessors resolve to the subquery's
own state rather than the enclosing query builder's.

This works for a `controlElements` entry as well as a slot: an entry is typed `ControlComponent`,
which accepts any component regardless of the props it declares. The props each control receives
are listed in `ControlPropsMap`.

Replacing `rule` or `ruleGroup` wholesale is a larger job, because those components own the class
names, the accessible description, and the child paths. Rather than recomputing any of that, use
`useRule`/`useRuleGroup`. Both accept a props getter:

```vue
<script setup lang="ts">
import { useRule, type RuleProps } from '@react-querybuilder/vue';

const props = defineProps<RuleProps>();
const parts = useRule(() => props);
</script>

<template>
  <div :class="parts.outerClassName.value" :data-path="JSON.stringify(props.path)">
    <!-- … -->
  </div>
</template>
```

## Driving the query from outside

To manipulate the query from outside the component tree, construct a `QueryManager` and pass it
in:

```vue
<script setup lang="ts">
import { QueryBuilder, QueryManager } from '@react-querybuilder/vue';

const manager = new QueryManager({ combinator: 'and', rules: [] }, { history: true });
</script>

<template>
  <button type="button" @click="manager.undo()">Undo</button>
  <QueryBuilder :fields="fields" :manager="manager" />
</template>
```

### Holding the manager in a store

A `QueryManager` can live in a Pinia store — or any `reactive()` container — and be shared by
unrelated components. This works as of `@react-querybuilder/core` 8.23.0, which moved the
manager's state into a non-enumerable, symbol-keyed own property flagged `__v_skip`: it reads
correctly through a reactive proxy, and `reactive()` will not deep-proxy its internals. On older
cores the same code threw `Cannot read private member #past`. See
[§3 of the differences doc](./differences-from-react-querybuilder.md#3-state-management) for the
proxy-safety note in full.

```ts
// stores/query.ts
import { QueryManager } from '@react-querybuilder/vue';
import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

export const useQueryStore = defineStore('query', () => {
  // The manager is stable; do not wrap it in `ref`. `shallowRef` mirrors the current query so
  // components re-render on commit — a deep `ref` would be rejected by the manager's
  // deep-freeze.
  const manager = new QueryManager({ combinator: 'and', rules: [] }, { history: true });
  const query = shallowRef(manager.getQuery());
  manager.subscribe(() => {
    query.value = manager.getQuery();
  });
  return { manager, query };
});
```

```vue
<script setup lang="ts">
import { QueryBuilder } from '@react-querybuilder/vue';
import { useQueryStore } from './stores/query';

const store = useQueryStore();
</script>

<template>
  <button type="button" @click="store.manager.undo()">Undo</button>
  <QueryBuilder :fields="fields" :manager="store.manager" />
  <pre>{{ store.query }}</pre>
</template>
```

Pass only `manager` — not `query`/`v-model:query` alongside it. The manager already owns the
query; a `query` prop would push a second source of truth into it.

Pinia is not a dependency of this package. Nothing above is Pinia-specific beyond
`defineStore` — the same shape works with a plain module-scoped composable.

## Classnames

`controlClassnames` appends to the standard classes rather than replacing them, so
`queryBuilder-invalid` and friends keep working:

```vue
<QueryBuilder
  :fields="fields"
  v-model:query="query"
  :control-classnames="{ rule: 'my-rule', queryBuilder: 'my-qb' }" />
```

To drop the standard classes entirely, pass `suppress-standard-classnames`.
