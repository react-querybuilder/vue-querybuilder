import type { RuleGroupType } from '@react-querybuilder/core';
import { render } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, onMounted, ref } from 'vue';
import { testFields } from '../../test/support.js';
import { provideQueryBuilderContext } from '../composables/context.js';
import { slotToComponent } from '../internal/slotToComponent.js';
import QueryBuilder from './QueryBuilder.vue';

const query: RuleGroupType = {
  combinator: 'and',
  rules: [{ field: 'firstName', operator: '=', value: 'Steve' }],
};

/**
 * Renders a `QueryBuilder` with the given template slots. The slots are written as a template so
 * that they are compiled the way a consumer's would be.
 */
const renderWithSlots = (slotTemplate: string, qbAttrs = '') =>
  render(
    defineComponent({
      components: { QueryBuilder },
      setup: () => ({ fields: testFields, query }),
      template: `<QueryBuilder :fields="fields" :query="query" ${qbAttrs}>${slotTemplate}</QueryBuilder>`,
    })
  );

describe('slotToComponent', () => {
  it('returns the same component for the same slot', () => {
    const slot = () => [h('span')];
    expect(slotToComponent(slot)).toBe(slotToComponent(slot));
  });

  it('returns a different component for a different slot', () => {
    expect(slotToComponent(() => [h('span')])).not.toBe(slotToComponent(() => [h('span')]));
  });
});

describe('control slots', () => {
  it('replaces a control with a keyed slot', () => {
    const { getByTestId } = renderWithSlots(
      `<template #valueEditor="p"><span data-testid="slot-editor">{{ p.value }}</span></template>`
    );
    expect(getByTestId('slot-editor')).toHaveTextContent('Steve');
  });

  it('passes the same props the component would have received', () => {
    const { getByTestId } = renderWithSlots(
      `<template #fieldSelector="p"><span data-testid="slot-field">{{ p.value }}|{{ p.testID }}|{{ p.options.length }}</span></template>`
    );
    expect(getByTestId('slot-field')).toHaveTextContent('firstName|fields|3');
  });

  it('takes precedence over a controlElements entry at the same level', () => {
    const Component = defineComponent({
      inheritAttrs: false,
      setup: () => () => h('span', { 'data-testid': 'component-editor' }),
    });
    const { getByTestId, queryByTestId } = render(
      defineComponent({
        components: { QueryBuilder },
        setup: () => ({ fields: testFields, query, controlElements: { valueEditor: Component } }),
        template: `<QueryBuilder :fields="fields" :query="query" :control-elements="controlElements">
          <template #valueEditor><span data-testid="slot-editor" /></template>
        </QueryBuilder>`,
      })
    );
    expect(getByTestId('slot-editor')).toBeInTheDocument();
    expect(queryByTestId('component-editor')).toBeNull();
  });

  it('applies the actionElement slot in bulk', () => {
    const { getAllByTestId, getByTestId } = renderWithSlots(
      `<template #actionElement="p"><button type="button" data-testid="bulk-action">{{ p.label }}</button></template>`
    );
    expect(getAllByTestId('bulk-action').length).toBeGreaterThan(1);
    // Not an action key, so the bulk slot must not apply.
    expect(getByTestId('value-editor')).toBeInTheDocument();
  });

  it('applies the valueSelector slot in bulk', () => {
    const { getAllByTestId, queryByTestId } = renderWithSlots(
      `<template #valueSelector="p"><span data-testid="bulk-selector">{{ p.testID }}</span></template>`
    );
    expect(getAllByTestId('bulk-selector').map(el => el.textContent)).toEqual([
      'combinators',
      'fields',
      'operators',
    ]);
    expect(queryByTestId('fields')).toBeNull();
  });

  it('does not apply a bulk slot to valueEditor, rule, ruleGroup, notToggle, or matchModeEditor', () => {
    const { getByTestId } = renderWithSlots(
      `<template #actionElement><span data-testid="bulk-action" /></template>
       <template #valueSelector><span data-testid="bulk-selector" /></template>`,
      `show-not-toggle`
    );
    expect(getByTestId('value-editor')).toBeInTheDocument();
    expect(getByTestId('rule')).toBeInTheDocument();
    expect(getByTestId('rule-group')).toBeInTheDocument();
    expect(getByTestId('not-toggle')).toBeInTheDocument();
  });

  it('prefers a keyed slot over a bulk slot at the same level', () => {
    const { getByTestId } = renderWithSlots(
      `<template #actionElement><span data-testid="bulk-action" /></template>
       <template #addRuleAction><span data-testid="keyed-action" /></template>`
    );
    expect(getByTestId('keyed-action')).toBeInTheDocument();
  });

  it('inherits slots through context', () => {
    const Provider = defineComponent({
      components: { QueryBuilder },
      setup(_, { slots }) {
        provideQueryBuilderContext(() => ({ slots: { valueEditor: slots.valueEditor } }));
        return () => h(QueryBuilder, { fields: testFields, query });
      },
    });
    const { getByTestId } = render(
      defineComponent({
        components: { Provider },
        template: `<Provider><template #valueEditor="p"><span data-testid="context-editor">{{ p.value }}</span></template></Provider>`,
      })
    );
    expect(getByTestId('context-editor')).toHaveTextContent('Steve');
  });

  it('prefers a props-level slot over a context-level component', () => {
    const ContextComponent = defineComponent({
      inheritAttrs: false,
      setup: () => () => h('span', { 'data-testid': 'context-editor' }),
    });
    const Provider = defineComponent({
      components: { QueryBuilder },
      setup(_, { slots }) {
        provideQueryBuilderContext(() => ({
          // The stand-in declares no props, so it is not a structural `Component<ValueEditorProps>`.
          controlElements: { valueEditor: ContextComponent as never },
        }));
        return () => slots.default?.();
      },
    });
    const { getByTestId, queryByTestId } = render(
      defineComponent({
        components: { Provider, QueryBuilder },
        setup: () => ({ fields: testFields, query }),
        template: `<Provider><QueryBuilder :fields="fields" :query="query">
          <template #valueEditor><span data-testid="slot-editor" /></template>
        </QueryBuilder></Provider>`,
      })
    );
    expect(getByTestId('slot-editor')).toBeInTheDocument();
    expect(queryByTestId('context-editor')).toBeNull();
  });

  it('lets a props-level null entry short-circuit an inherited slot', () => {
    const Provider = defineComponent({
      components: { QueryBuilder },
      setup(_, { slots }) {
        provideQueryBuilderContext(() => ({ slots: { valueEditor: slots.valueEditor } }));
        return () => slots.default?.();
      },
    });
    const { queryByTestId } = render(
      defineComponent({
        components: { Provider, QueryBuilder },
        setup: () => ({ fields: testFields, query, controlElements: { valueEditor: null } }),
        template: `<Provider>
          <template #valueEditor><span data-testid="context-editor" /></template>
          <QueryBuilder :fields="fields" :query="query" :control-elements="controlElements" />
        </Provider>`,
      })
    );
    expect(queryByTestId('context-editor')).toBeNull();
    expect(queryByTestId('value-editor')).toBeNull();
  });

  it('does not remount the slot subtree when an unrelated prop changes', async () => {
    let mounts = 0;
    const Counted = defineComponent({
      setup() {
        onMounted(() => {
          mounts++;
        });
        return () => h('span', { 'data-testid': 'counted' });
      },
    });
    const showNotToggle = ref(false);
    const { getByTestId, findByTestId } = render(
      defineComponent({
        components: { QueryBuilder, Counted },
        setup: () => ({ fields: testFields, query, showNotToggle }),
        template: `<QueryBuilder :fields="fields" :query="query" :show-not-toggle="showNotToggle">
          <template #valueEditor><Counted /></template>
        </QueryBuilder>`,
      })
    );
    expect(getByTestId('counted')).toBeInTheDocument();
    expect(mounts).toBe(1);

    showNotToggle.value = true;
    await findByTestId('not-toggle');
    expect(mounts).toBe(1);
  });
});
