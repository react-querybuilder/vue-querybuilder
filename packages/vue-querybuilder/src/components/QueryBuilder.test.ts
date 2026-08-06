import type { RuleGroupType, RuleGroupTypeAny } from '@react-querybuilder/core';
import { defaultCombinators } from '@react-querybuilder/core';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { testFields } from '../../test/support.js';
import QueryBuilder from './QueryBuilder.vue';

const flat: RuleGroupType = {
  combinator: 'and',
  rules: [
    { field: 'firstName', operator: '=', value: 'Steve' },
    { field: 'lastName', operator: '=', value: 'Vai' },
  ],
};

const renderQB = (props: Record<string, unknown> = {}) =>
  render(QueryBuilder, { props: { fields: testFields, ...props } });

describe('QueryBuilder', () => {
  it('renders the root wrapper with the DOM contract React specifies', () => {
    const { container } = renderQB({ defaultQuery: flat });
    const root = container.querySelector('div[role="form"]')!;
    expect(root).toHaveClass('queryBuilder');
    expect(root).toHaveAttribute('data-dnd', 'disabled');
    expect(root).toHaveAttribute('data-inlinecombinators', 'disabled');
  });

  it('renders a rule group and one rule per rule', () => {
    const { getAllByTestId } = renderQB({ defaultQuery: flat });
    expect(getAllByTestId('rule-group')).toHaveLength(1);
    expect(getAllByTestId('rule')).toHaveLength(2);
    expect(getAllByTestId('rule').map(r => r.dataset.path)).toEqual(['[0]', '[1]']);
  });

  it('nests groups and reports their level and path', () => {
    const { getAllByTestId } = renderQB({
      defaultQuery: {
        combinator: 'and',
        rules: [{ combinator: 'or', rules: [{ field: 'firstName', operator: '=', value: 'S' }] }],
      },
    });
    const groups = getAllByTestId('rule-group');
    expect(groups.map(g => g.dataset.path)).toEqual(['[]', '[0]']);
    expect(groups.map(g => g.dataset.level)).toEqual(['0', '1']);
  });

  it('marks independent-combinator queries on the wrapper', () => {
    const { container } = renderQB({
      defaultQuery: { rules: [{ field: 'firstName', operator: '=', value: 'S' }] },
    });
    expect(container.querySelector('div[role="form"]')).toHaveAttribute(
      'data-inlinecombinators',
      'enabled'
    );
  });

  it('adds a rule and reports it through onQueryChange', async () => {
    const onQueryChange = vi.fn();
    const { getByTestId, getAllByTestId } = renderQB({ defaultQuery: flat, onQueryChange });
    await userEvent.click(getByTestId('add-rule'));
    expect(getAllByTestId('rule')).toHaveLength(3);
    expect(onQueryChange.mock.lastCall![0].rules).toHaveLength(3);
  });

  it('adds a group', async () => {
    const { getByTestId, getAllByTestId } = renderQB({ defaultQuery: flat });
    await userEvent.click(getByTestId('add-group'));
    expect(getAllByTestId('rule-group')).toHaveLength(2);
  });

  it('removes a rule', async () => {
    const { getAllByTestId } = renderQB({ defaultQuery: flat });
    await userEvent.click(getAllByTestId('remove-rule')[0]);
    expect(getAllByTestId('rule')).toHaveLength(1);
  });

  it('removes a group', async () => {
    const { getAllByTestId, getByTestId } = renderQB({
      defaultQuery: { combinator: 'and', rules: [{ combinator: 'or', rules: [] }] },
    });
    await userEvent.click(getByTestId('remove-group'));
    expect(getAllByTestId('rule-group')).toHaveLength(1);
  });

  it('changes a rule field, operator, and value', async () => {
    const onQueryChange = vi.fn();
    const { getAllByTestId } = renderQB({ defaultQuery: flat, onQueryChange });
    await userEvent.selectOptions(getAllByTestId('fields')[0], 'lastName');
    expect(onQueryChange.mock.lastCall![0].rules[0].field).toBe('lastName');

    await userEvent.selectOptions(getAllByTestId('operators')[0], '!=');
    expect(onQueryChange.mock.lastCall![0].rules[0].operator).toBe('!=');

    await userEvent.type(getAllByTestId('value-editor')[0], '!');
    expect(onQueryChange.mock.lastCall![0].rules[0].value).toMatch(/!$/);
  });

  it('changes the combinator', async () => {
    const onQueryChange = vi.fn();
    const { getByTestId } = renderQB({ defaultQuery: flat, onQueryChange });
    await userEvent.selectOptions(getByTestId('combinators'), 'or');
    expect(onQueryChange.mock.lastCall![0].combinator).toBe('or');
  });

  it('supports v-model:query', async () => {
    const Host = defineComponent({
      setup() {
        const query = ref<RuleGroupType>(flat);
        return () => [
          h(QueryBuilder, {
            fields: testFields,
            query: query.value,
            // `h()` cannot infer a generic component's type parameters, so the emit signature
            // falls back to the constraint.
            'onUpdate:query': (q: RuleGroupTypeAny) => {
              query.value = q as RuleGroupType;
            },
          }),
          h('output', {}, `${query.value.rules.length}`),
        ];
      },
    });
    const { getByTestId, getByRole } = render(Host);
    expect(getByRole('status')).toHaveTextContent('2');
    await userEvent.click(getByTestId('add-rule'));
    expect(getByRole('status')).toHaveTextContent('3');
  });

  it('is driven by a controlled `query` prop', async () => {
    const { rerender, getAllByTestId } = renderQB({ query: flat });
    expect(getAllByTestId('rule')).toHaveLength(2);
    await rerender({
      fields: testFields,
      query: { combinator: 'and', rules: [flat.rules[0]] } as RuleGroupType,
    });
    expect(getAllByTestId('rule')).toHaveLength(1);
  });

  it('does not enable a boolean flag the consumer never set', () => {
    // Vue casts an omitted boolean prop to `false` unless it is given an explicit `undefined`
    // default. Without that, `autoSelectField` (which defaults to `true`) would flip to `false`
    // and the field selector would grow a placeholder option.
    const { getAllByTestId } = renderQB({ defaultQuery: flat });
    const fieldSelector = getAllByTestId('fields')[0] as HTMLSelectElement;
    expect([...fieldSelector.options].map(o => o.value)).toEqual(testFields.map(f => f.name));
  });

  it('honors a flag the consumer does set', () => {
    const { getAllByTestId } = renderQB({ defaultQuery: flat, autoSelectField: false });
    const fieldSelector = getAllByTestId('fields')[0] as HTMLSelectElement;
    expect(fieldSelector.options[0].value).toBe('~');
  });

  it('fires onQueryChange on mount by default', () => {
    const onQueryChange = vi.fn();
    renderQB({ defaultQuery: flat, onQueryChange });
    expect(onQueryChange).toHaveBeenCalledTimes(1);
  });

  it('suppresses the mount notification when asked', () => {
    const onQueryChange = vi.fn();
    renderQB({ defaultQuery: flat, onQueryChange, enableMountQueryChange: false });
    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it('renders the optional controls only when their flags are set', async () => {
    const { queryByTestId } = renderQB({ defaultQuery: flat });
    expect(queryByTestId('clone-rule')).toBeNull();
    expect(queryByTestId('lock-rule')).toBeNull();
    expect(queryByTestId('mute-rule')).toBeNull();

    const withAll = renderQB({
      defaultQuery: flat,
      showCloneButtons: true,
      showLockButtons: true,
      showMuteButtons: true,
    });
    expect(withAll.getAllByTestId('clone-rule')).toHaveLength(2);
    expect(withAll.getAllByTestId('lock-rule')).toHaveLength(2);
    expect(withAll.getAllByTestId('mute-rule')).toHaveLength(2);
  });

  it('clones a rule', async () => {
    const { getAllByTestId } = renderQB({ defaultQuery: flat, showCloneButtons: true });
    await userEvent.click(getAllByTestId('clone-rule')[0]);
    expect(getAllByTestId('rule')).toHaveLength(3);
  });

  it('locks a rule', async () => {
    const onQueryChange = vi.fn();
    const { getAllByTestId } = renderQB({
      defaultQuery: flat,
      showLockButtons: true,
      onQueryChange,
    });
    await userEvent.click(getAllByTestId('lock-rule')[0]);
    expect(onQueryChange.mock.lastCall![0].rules[0].disabled).toBe(true);
  });

  it('mutes a rule', async () => {
    const onQueryChange = vi.fn();
    const { getAllByTestId } = renderQB({
      defaultQuery: flat,
      showMuteButtons: true,
      onQueryChange,
    });
    await userEvent.click(getAllByTestId('mute-rule')[0]);
    expect(onQueryChange.mock.lastCall![0].rules[0].muted).toBe(true);
  });

  it('disables every control when `disabled` is true', () => {
    const { getAllByTestId, container } = renderQB({ defaultQuery: flat, disabled: true });
    expect(container.querySelector('div[role="form"]')).toHaveClass('queryBuilder-disabled');
    for (const select of getAllByTestId('fields')) expect(select).toBeDisabled();
  });

  it('hides the add-group button past maxLevels', () => {
    // React's condition is `maxLevels > path.length`, so `maxLevels: 1` keeps the button at the
    // root and drops it one level down.
    const { getAllByTestId, queryAllByTestId } = renderQB({
      defaultQuery: { combinator: 'and', rules: [{ combinator: 'or', rules: [] }] },
      maxLevels: 1,
    });
    expect(getAllByTestId('rule-group')).toHaveLength(2);
    expect(queryAllByTestId('add-group')).toHaveLength(1);
  });

  it('applies custom classnames', () => {
    const { container } = renderQB({
      defaultQuery: flat,
      controlClassnames: { queryBuilder: 'custom-qb', rule: 'custom-rule' },
    });
    expect(container.querySelector('div[role="form"]')).toHaveClass('custom-qb');
    expect(container.querySelector('[data-testid="rule"]')).toHaveClass('custom-rule');
  });

  it('uses replacement components from controlElements', () => {
    const { getAllByTestId } = renderQB({
      defaultQuery: flat,
      controlElements: {
        valueEditor: defineComponent({
          props: { testID: { type: String, default: '' } },
          setup: p => () => h('div', { 'data-testid': p.testID }, 'custom editor'),
        }),
      },
    });
    expect(getAllByTestId('value-editor')[0]).toHaveTextContent('custom editor');
  });

  it('renders nothing for a `null` controlElements entry', () => {
    const { queryByTestId } = renderQB({
      defaultQuery: flat,
      controlElements: { removeRuleAction: null },
    });
    expect(queryByTestId('remove-rule')).toBeNull();
  });

  it('renders every optional control', () => {
    const { queryAllByTestId } = renderQB({
      defaultQuery: flat,
      showNotToggle: true,
      showShiftActions: true,
      showUndoRedo: true,
      showCombinatorsBetweenRules: true,
    });
    // Milestone B: no key resolves to `nullComponent` any more.
    expect(queryAllByTestId('not-toggle')).toHaveLength(1);
    // One per rule, plus one for the group itself (which is the root, so it renders none).
    expect(queryAllByTestId('shift-actions')).toHaveLength(2);
    expect(queryAllByTestId('undo-redo-actions')).toHaveLength(1);
    expect(queryAllByTestId('inline-combinator')).toHaveLength(1);
  });

  it('applies a validator to the wrapper class', () => {
    const { container } = renderQB({ defaultQuery: flat, validator: () => false });
    expect(container.querySelector('div[role="form"]')).toHaveClass('queryBuilder-invalid');
  });

  it('uses a custom combinator list', () => {
    const { getByTestId } = renderQB({
      defaultQuery: flat,
      combinators: [...defaultCombinators, { name: 'xor', value: 'xor', label: 'XOR' }],
    });
    expect([...(getByTestId('combinators') as HTMLSelectElement).options].at(-1)!.value).toBe(
      'xor'
    );
  });
});
