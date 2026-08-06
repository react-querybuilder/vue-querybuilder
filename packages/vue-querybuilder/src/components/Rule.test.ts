import type { RuleType } from '@react-querybuilder/core';
import { render } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import { effectScope, h } from 'vue';
import { baseProps, createRecordingActions, ruleProps } from '../../test/support.js';
import { useQueryBuilder } from '../composables/useQueryBuilder.js';
import { defaultControlElements } from './defaultControlElements.js';
import Rule from './Rule.vue';

const rule: RuleType = { id: 'r0', field: 'firstName', operator: '=', value: 'Steve' };

/**
 * Builds `RuleProps` outside of any component, so a `Rule` can be rendered in isolation with a
 * real schema but recorded (rather than applied) actions.
 */
const setup = (props: Record<string, unknown> = {}, qbProps: Record<string, unknown> = {}) => {
  const scope = effectScope();
  const { actions } = createRecordingActions();
  const state = scope.run(() =>
    useQueryBuilder(baseProps(qbProps), { defaultControls: defaultControlElements })
  )!;
  return { ...ruleProps(state, rule, { actions, ...props }), scope };
};

describe('Rule', () => {
  it('renders the rule element with its path and level', () => {
    const { getByTestId } = render(Rule, { props: setup({ path: [1, 2], id: 'r0' }) });
    const el = getByTestId('rule');
    expect(el).toHaveClass('rule');
    expect(el).toHaveAttribute('data-path', '[1,2]');
    expect(el).toHaveAttribute('data-level', '2');
    expect(el).toHaveAttribute('data-rule-id', 'r0');
  });

  it('renders the field selector, operator selector, and value editor in order', () => {
    const { getByTestId } = render(Rule, { props: setup() });
    const testIDs = [...getByTestId('rule').querySelectorAll('[data-testid]')].map(el =>
      el.getAttribute('data-testid')
    );
    expect(testIDs).toEqual(['fields', 'operators', 'value-editor', 'remove-rule']);
  });

  it('hides the field selector when the only field is the placeholder', () => {
    const { queryByTestId } = render(Rule, {
      props: setup({}, { fields: [{ name: '~', value: '', label: '------' }] }),
    });
    expect(queryByTestId('fields')).toBeNull();
  });

  it('hides the value controls for a unary operator', () => {
    const props = setup();
    props.rule = { ...rule, operator: 'null' };
    const { queryByTestId } = render(Rule, { props });
    expect(queryByTestId('value-editor')).toBeNull();
  });

  it('renders the value source selector when more than one source is available', () => {
    const { getByTestId } = render(Rule, {
      props: setup({}, { getValueSources: () => ['value', 'field'] }),
    });
    expect(getByTestId('value-source-selector')).toBeInTheDocument();
  });

  it('reports itself as disabled when its parent is', () => {
    const { getByTestId } = render(Rule, { props: setup({ parentDisabled: true }) });
    expect(getByTestId('rule')).toHaveClass('queryBuilder-disabled');
    expect(getByTestId('fields')).toBeDisabled();
  });

  it('applies a getRuleClassname result', () => {
    const { getByTestId } = render(Rule, {
      props: setup({}, { getRuleClassname: () => 'from-callback' }),
    });
    expect(getByTestId('rule')).toHaveClass('from-callback');
  });

  it('renders a replacement rule subcomponent from the schema controls', () => {
    const props = setup();
    props.schema = {
      ...props.schema,
      controls: {
        ...props.schema.controls,
        removeRuleAction: () => h('div', { 'data-testid': 'custom-remove' }),
      },
    };
    const { getByTestId } = render(Rule, { props });
    expect(getByTestId('custom-remove')).toBeInTheDocument();
  });
});
