import type { RuleGroupType } from '@react-querybuilder/core';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import QueryBuilder from './QueryBuilder.vue';

/**
 * `RuleSubQuery` is only reachable through `Rule`, so it is exercised the way it is used: a
 * field with `subproperties` and `matchModes`, rendered by a whole query builder.
 */
const subField = {
  name: 'sub',
  label: 'Sub',
  matchModes: true,
  subproperties: [
    { name: 's1', label: 'S1' },
    { name: 's2', label: 'S2' },
  ],
};

const renderQB = (props: Record<string, unknown> = {}) =>
  render(QueryBuilder, { props: { fields: [subField], ...props } });

const emptySubQuery = (): RuleGroupType => ({
  id: 'root',
  combinator: 'and',
  rules: [
    {
      id: 'r0',
      field: 'sub',
      operator: '=',
      value: { id: 'sq0', combinator: 'and', rules: [] },
      match: { mode: 'all' },
    },
  ],
});

describe('RuleSubQuery', () => {
  it('renders a match-mode editor instead of an operator selector', () => {
    const { queryByTestId, getAllByTestId } = renderQB({ defaultQuery: emptySubQuery() });
    expect(getAllByTestId('match-mode-editor')).not.toHaveLength(0);
    expect(queryByTestId('operators')).toBeNull();
    expect(queryByTestId('value-editor')).toBeNull();
  });

  it('marks the rule as having a subquery', () => {
    const { getByTestId } = renderQB({ defaultQuery: emptySubQuery() });
    expect(getByTestId('rule')).toHaveClass('rule-hasSubQuery');
  });

  it('renders the subquery group header and body in wrapper divs inside the rule', () => {
    const { getByTestId } = renderQB({ defaultQuery: emptySubQuery() });
    const rule = getByTestId('rule');
    const header = rule.querySelector('.ruleGroup-header')!;
    const body = rule.querySelector('.ruleGroup-body')!;
    expect(header).not.toBeNull();
    expect(body).not.toBeNull();
    expect(header.tagName).toBe('DIV');
    expect(body.tagName).toBe('DIV');
    // The header precedes the rule's own remove button, which precedes the body.
    const remove = rule.querySelector('[data-testid="remove-rule"]')!;
    expect(header.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(remove.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('offers the field\u2019s subproperties in the subquery field selector', async () => {
    const onQueryChange = vi.fn();
    const { getAllByTestId } = renderQB({ defaultQuery: emptySubQuery(), onQueryChange });
    await userEvent.click(getAllByTestId('add-rule').at(-1)!);
    await nextTick();
    const fieldSelectors = getAllByTestId('fields');
    const subSelector = fieldSelectors.at(-1) as HTMLSelectElement;
    expect([...subSelector.options].map(o => o.value)).toEqual(['s1', 's2']);
  });

  it('writes subquery changes back through the rule\u2019s value', async () => {
    const onQueryChange = vi.fn();
    const { getAllByTestId } = renderQB({ defaultQuery: emptySubQuery(), onQueryChange });
    onQueryChange.mockClear();
    await userEvent.click(getAllByTestId('add-rule').at(-1)!);
    await nextTick();
    const latest = onQueryChange.mock.calls.at(-1)![0] as RuleGroupType;
    const value = (latest.rules[0] as { value: RuleGroupType }).value;
    expect(value.rules).toHaveLength(1);
    expect(value.rules[0]).toMatchObject({ field: 's1' });
  });

  it('seeds a rule group into the value when it is not already one', async () => {
    const onQueryChange = vi.fn();
    renderQB({
      defaultQuery: {
        combinator: 'and',
        rules: [{ id: 'r0', field: 'sub', operator: '=', value: '', match: { mode: 'all' } }],
      },
      onQueryChange,
    });
    await nextTick();
    const latest = onQueryChange.mock.calls.at(-1)![0] as RuleGroupType;
    const value = (latest.rules[0] as { value: unknown }).value as RuleGroupType;
    expect(value).toMatchObject({ combinator: 'and', rules: [] });
    expect(value.id).toBeTruthy();
  });

  it('changes the match mode through the editor', async () => {
    const onQueryChange = vi.fn();
    const { getAllByTestId } = renderQB({ defaultQuery: emptySubQuery(), onQueryChange });
    onQueryChange.mockClear();
    await userEvent.selectOptions(getAllByTestId('match-mode-editor')[0], 'atLeast');
    const latest = onQueryChange.mock.calls.at(-1)![0] as RuleGroupType;
    expect((latest.rules[0] as { match: unknown }).match).toEqual({
      mode: 'atLeast',
      threshold: 1,
    });
  });

  it('propagates `disabled` into the subquery', () => {
    const { getByTestId } = renderQB({ defaultQuery: emptySubQuery(), disabled: true });
    const rule = getByTestId('rule');
    for (const control of rule.querySelectorAll('select,input,button')) {
      expect(control).toBeDisabled();
    }
  });

  it('renders an existing subquery\u2019s rules', () => {
    const { getAllByTestId } = renderQB({
      defaultQuery: {
        combinator: 'and',
        rules: [
          {
            id: 'r0',
            field: 'sub',
            operator: '=',
            value: {
              id: 'sq0',
              combinator: 'or',
              rules: [{ id: 'sr0', field: 's1', operator: '=', value: 'x' }],
            },
            match: { mode: 'all' },
          },
        ],
      },
    });
    // The outer rule plus the subquery's own rule.
    expect(getAllByTestId('rule')).toHaveLength(2);
    expect((getAllByTestId('value-editor')[0] as HTMLInputElement).value).toBe('x');
  });

  it('leaves the DOM of a rule without a subquery unchanged', () => {
    const { getByTestId, queryByTestId } = render(QueryBuilder, {
      props: {
        fields: [{ name: 'f1', label: 'F1' }],
        defaultQuery: {
          combinator: 'and',
          rules: [{ id: 'r0', field: 'f1', operator: '=', value: 'v1' }],
        },
      },
    });
    const rule = getByTestId('rule');
    expect(rule).not.toHaveClass('rule-hasSubQuery');
    expect(rule.querySelector('.ruleGroup-header')).toBeNull();
    expect(rule.querySelector('.ruleGroup-body')).toBeNull();
    expect(queryByTestId('match-mode-editor')).toBeNull();
    expect(queryByTestId('operators')).not.toBeNull();
  });
});
