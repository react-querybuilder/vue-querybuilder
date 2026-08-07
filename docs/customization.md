# Customization

Every part of the rendered tree can be replaced. There are three levels, in order of increasing
reach:

1. **Translations** — change the text (or markup) of a label or tooltip.
2. **Slots and `controlElements`** — replace an individual control.
3. **Context** — apply either of the above to every query builder in a subtree.

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

defineOptions({ inheritAttrs: false });
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

Set `inheritAttrs: false`. `Rule` and `RuleGroup` hand every subcomponent a common prop bag, and
anything a replacement does not declare would otherwise land on the DOM as a stray attribute.

Keep `data-testid`, `class`, and `title` if you want the standard stylesheets — and any tests
written against the standard DOM — to keep working.

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
