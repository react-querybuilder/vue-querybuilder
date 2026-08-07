import type { RuleGroupType } from '@react-querybuilder/core';
import { QueryManager, TestID } from '@react-querybuilder/core';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import QueryBuilder from './QueryBuilder.vue';

const fields = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
];

const altFields = [
  { name: 'age', label: 'Age' },
  { name: 'height', label: 'Height' },
];

const query: RuleGroupType = {
  combinator: 'and',
  rules: [{ id: 'r1', field: 'firstName', operator: '=', value: 'Steve' }],
};

const optionValues = (select: HTMLElement) =>
  [...(select as HTMLSelectElement).querySelectorAll('option')].map(o => o.value);

const optionLabels = (select: HTMLElement) =>
  [...(select as HTMLSelectElement).querySelectorAll('option')].map(o => o.textContent);

const innerAddGroup = () => screen.getAllByTestId(TestID.addGroup)[1];

const subSelector = () => screen.getAllByTestId(TestID.fields).at(-1)!;

const subFields = (subproperties: { name: string; label: string }[]) => [
  { name: 'tags', label: 'Tags', matchModes: true, subproperties },
];

/**
 * The reconfigure watcher runs at `flush: 'post'`, so a prop change needs one extra tick beyond
 * `rerender`'s own before the new options are visible.
 */
const settle = async () => {
  await nextTick();
  await nextTick();
};

/**
 * Structural options reach the manager through `reconfigure`, so a changed prop updates the
 * option lists in place without discarding the query, the undo/redo history, or subscribers.
 */
describe('QueryBuilder reconfiguration', () => {
  it('updates the field selector when `fields` changes', async () => {
    const { rerender } = render(QueryBuilder, { props: { fields, defaultQuery: query } });

    expect(optionValues(screen.getByTestId(TestID.fields))).toEqual(['firstName', 'lastName']);

    await rerender({ fields: altFields });
    await settle();

    expect(optionValues(screen.getByTestId(TestID.fields))).toEqual(['age', 'height']);
  });

  it('uses the new `fields` for rules added after the change', async () => {
    const onQueryChange = vi.fn();
    const { rerender } = render(QueryBuilder, {
      props: { fields, defaultQuery: query, onQueryChange },
    });

    await rerender({ fields: altFields });
    await settle();
    await userEvent.click(screen.getByTestId(TestID.addRule));

    const nextQuery = onQueryChange.mock.lastCall![0] as RuleGroupType;
    expect(nextQuery.rules).toHaveLength(2);
    expect((nextQuery.rules[1] as { field: string }).field).toBe('age');
  });

  it('updates the operator selector when `operators` changes', async () => {
    const { rerender } = render(QueryBuilder, {
      props: { fields, defaultQuery: query, operators: [{ name: '=', label: 'is' }] },
    });

    expect(optionValues(screen.getByTestId(TestID.operators))).toEqual(['=']);

    await rerender({
      operators: [
        { name: '=', label: 'is' },
        { name: '!=', label: 'is not' },
      ],
    });
    await settle();

    expect(optionValues(screen.getByTestId(TestID.operators))).toEqual(['=', '!=']);
  });

  it('updates the combinator selector when `combinators` changes', async () => {
    const { rerender } = render(QueryBuilder, {
      props: { fields, defaultQuery: query, combinators: [{ name: 'and', label: 'AND' }] },
    });

    expect(optionValues(screen.getByTestId(TestID.combinators))).toEqual(['and']);

    await rerender({
      combinators: [
        { name: 'and', label: 'AND' },
        { name: 'or', label: 'OR' },
      ],
    });
    await settle();

    expect(optionValues(screen.getByTestId(TestID.combinators))).toEqual(['and', 'or']);
  });

  it('updates placeholder options when `translations` changes', async () => {
    const { rerender } = render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: { combinator: 'and', rules: [{ field: '~', operator: '=', value: '' }] },
        autoSelectField: false,
      },
    });

    expect(optionLabels(screen.getByTestId(TestID.fields))).toContain('------');

    await rerender({ translations: { fields: { placeholderLabel: 'Choisir un champ' } } });
    await settle();

    expect(optionLabels(screen.getByTestId(TestID.fields))).toContain('Choisir un champ');
  });

  it('honors a changed `maxLevels`', async () => {
    const onQueryChange = vi.fn();
    const nested: RuleGroupType = {
      combinator: 'and',
      rules: [
        { id: 'r1', field: 'firstName', operator: '=', value: 'Steve' },
        { id: 'g1', combinator: 'and', rules: [] },
      ],
    };
    const { rerender } = render(QueryBuilder, {
      props: { fields, defaultQuery: nested, maxLevels: 1, onQueryChange },
    });

    onQueryChange.mockClear();
    await userEvent.click(innerAddGroup());
    expect(onQueryChange).not.toHaveBeenCalled();

    await rerender({ maxLevels: 2 });
    await settle();
    await userEvent.click(innerAddGroup());

    const next = onQueryChange.mock.lastCall![0] as RuleGroupType;
    expect((next.rules[1] as RuleGroupType).rules).toHaveLength(1);
  });

  it('honors a changed `disabled` boolean', async () => {
    const onQueryChange = vi.fn();
    const { rerender } = render(QueryBuilder, {
      props: { fields, defaultQuery: query, disabled: true, onQueryChange },
    });

    await rerender({ disabled: false });
    await settle();
    onQueryChange.mockClear();
    await userEvent.click(screen.getByTestId(TestID.addRule));

    expect(onQueryChange).toHaveBeenCalled();
  });

  it('honors a changed `disabled` path array', async () => {
    const onQueryChange = vi.fn();
    const { rerender } = render(QueryBuilder, {
      props: { fields, defaultQuery: query, disabled: [] as number[][], onQueryChange },
    });

    await rerender({ disabled: [[]] });
    await settle();
    onQueryChange.mockClear();
    await userEvent.click(screen.getByTestId(TestID.addRule));

    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it('preserves undo history across a reconfiguration', async () => {
    const onQueryChange = vi.fn();
    const { rerender } = render(QueryBuilder, {
      props: { fields, defaultQuery: query, showUndoRedo: true, onQueryChange },
    });

    await userEvent.click(screen.getByTestId(TestID.addRule));
    expect((onQueryChange.mock.lastCall![0] as RuleGroupType).rules).toHaveLength(2);

    await rerender({ fields: altFields });
    await settle();

    const undo = screen.getByTestId(TestID.undoAction);
    expect(undo).toBeEnabled();
    await userEvent.click(undo);

    const restored = onQueryChange.mock.lastCall![0] as RuleGroupType;
    expect(restored.rules).toHaveLength(1);
    expect((restored.rules[0] as { field: string }).field).toBe('firstName');
  });

  it('does not fire `onQueryChange` for a config-only change', async () => {
    const onQueryChange = vi.fn();
    const { rerender } = render(QueryBuilder, {
      props: { fields, defaultQuery: query, onQueryChange },
    });

    onQueryChange.mockClear();
    await rerender({ fields: altFields });
    await settle();

    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it('never reconfigures an externally supplied manager', async () => {
    const manager = new QueryManager(query, { fields });
    const reconfigure = vi.spyOn(manager, 'reconfigure');
    const { rerender } = render(QueryBuilder, { props: { fields, manager } });

    await rerender({ fields: altFields });
    await settle();

    expect(reconfigure).not.toHaveBeenCalled();
    expect(optionValues(screen.getByTestId(TestID.fields))).toEqual(['firstName', 'lastName']);
  });

  it('updates a subquery builder when `subproperties` change', async () => {
    const subQuery: RuleGroupType = {
      id: 'sg',
      combinator: 'and',
      rules: [{ id: 'sr1', field: 'name', operator: '=', value: 'x' }],
    };
    const outerQuery: RuleGroupType = {
      combinator: 'and',
      rules: [{ id: 'r1', field: 'tags', operator: '=', value: subQuery, match: { mode: 'all' } }],
    };
    const { rerender } = render(QueryBuilder, {
      props: {
        fields: subFields([
          { name: 'name', label: 'Name' },
          { name: 'count', label: 'Count' },
        ]),
        defaultQuery: outerQuery,
      },
    });

    expect(optionValues(subSelector())).toEqual(['name', 'count']);

    await rerender({
      fields: subFields([
        { name: 'name', label: 'Name' },
        { name: 'color', label: 'Color' },
      ]),
    });
    await settle();

    expect(optionValues(subSelector())).toEqual(['name', 'color']);
  });
});
