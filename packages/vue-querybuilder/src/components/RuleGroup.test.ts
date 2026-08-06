import type { RuleGroupTypeAny } from '@react-querybuilder/core';
import { render } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import { effectScope, h } from 'vue';
import {
  baseProps,
  createRecordingActions,
  flatQuery,
  ruleGroupProps,
} from '../../test/support.js';
import { useQueryBuilder } from '../composables/useQueryBuilder.js';
import { defaultControlElements } from './defaultControlElements.js';
import RuleGroup from './RuleGroup.vue';

const setup = (
  ruleGroup: RuleGroupTypeAny = flatQuery,
  props: Record<string, unknown> = {},
  qbProps: Record<string, unknown> = {}
) => {
  const scope = effectScope();
  const { actions } = createRecordingActions();
  const state = scope.run(() =>
    useQueryBuilder(baseProps({ defaultQuery: ruleGroup, ...qbProps }), {
      defaultControls: defaultControlElements,
    })
  )!;
  return ruleGroupProps(state, ruleGroup, { actions, ...props });
};

describe('RuleGroup', () => {
  it('renders the group element, header, and body', () => {
    const { getByTestId } = render(RuleGroup, { props: setup(flatQuery, { id: 'g0' }) });
    const group = getByTestId('rule-group');
    expect(group).toHaveClass('ruleGroup');
    expect(group).toHaveAttribute('data-path', '[]');
    expect(group).toHaveAttribute('data-level', '0');
    expect(group).toHaveAttribute('data-rule-group-id', 'g0');
    expect(group).toHaveAttribute('title', 'Query builder');
    expect(group.children[0]).toHaveClass('ruleGroup-header');
    expect(group.children[1]).toHaveClass('ruleGroup-body');
  });

  it('renders the header controls in React’s order', () => {
    const { getByTestId } = render(RuleGroup, { props: setup() });
    const header = getByTestId('rule-group').querySelector('.ruleGroup-header')!;
    expect(
      [...header.querySelectorAll('[data-testid]')].map(el => el.getAttribute('data-testid'))
    ).toEqual(['combinators', 'add-rule', 'add-group']);
  });

  it('renders one child per rule, in order', () => {
    const { getAllByTestId } = render(RuleGroup, { props: setup() });
    expect(getAllByTestId('rule').map(r => r.getAttribute('data-path'))).toEqual(['[0]', '[1]']);
  });

  it('renders nested groups through the schema controls', () => {
    const nested: RuleGroupTypeAny = {
      combinator: 'and',
      rules: [{ combinator: 'or', rules: [flatQuery.rules[0]] }],
    };
    const { getAllByTestId } = render(RuleGroup, { props: setup(nested) });
    expect(getAllByTestId('rule-group').map(g => g.getAttribute('data-path'))).toEqual([
      '[]',
      '[0]',
    ]);
  });

  it('omits the remove, clone, and shift controls at the root and renders them below it', () => {
    const nested: RuleGroupTypeAny = {
      combinator: 'and',
      rules: [{ combinator: 'or', rules: [] }],
    };
    const { getAllByTestId, queryAllByTestId } = render(RuleGroup, { props: setup(nested) });
    expect(queryAllByTestId('remove-group')).toHaveLength(1);
    expect(getAllByTestId('remove-group')[0].closest('[data-testid="rule-group"]')).toHaveAttribute(
      'data-path',
      '[0]'
    );
  });

  it('omits the header combinator selector for independent combinators', () => {
    const ic = { rules: [flatQuery.rules[0], 'and', flatQuery.rules[1]] } as RuleGroupTypeAny;
    const { queryByTestId, getAllByTestId } = render(RuleGroup, { props: setup(ic) });
    expect(queryByTestId('combinators')).toBeNull();
    expect(getAllByTestId('rule')).toHaveLength(2);
  });

  it('marks a negated group', () => {
    const { getByTestId } = render(RuleGroup, {
      props: setup({ ...flatQuery, not: true } as RuleGroupTypeAny),
    });
    expect(getByTestId('rule-group')).toHaveAttribute('data-not', 'true');
  });

  it('applies a getRuleGroupClassname result', () => {
    const { getByTestId } = render(RuleGroup, {
      props: setup(flatQuery, {}, { getRuleGroupClassname: () => 'from-callback' }),
    });
    expect(getByTestId('rule-group')).toHaveClass('from-callback');
  });

  it('passes its own disabled state down to its children', () => {
    const { getAllByTestId } = render(RuleGroup, { props: setup(flatQuery, { disabled: true }) });
    for (const select of getAllByTestId('fields')) expect(select).toBeDisabled();
  });

  it('renders a replacement group subcomponent from the schema controls', () => {
    const props = setup();
    props.schema = {
      ...props.schema,
      controls: {
        ...props.schema.controls,
        addRuleAction: () => h('div', { 'data-testid': 'custom-add' }),
      },
    };
    const { getByTestId } = render(RuleGroup, { props });
    expect(getByTestId('custom-add')).toBeInTheDocument();
  });
});
