import type { FullCombinator, FullField } from '@react-querybuilder/core';
import { render } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import type { Schema } from '../types/schema.js';

type TestSchema = Schema<FullField, string>;
import InlineCombinator from './InlineCombinator.vue';
import ValueSelector from './ValueSelector.vue';

const schema = (overrides: Partial<TestSchema> = {}) =>
  ({
    classNames: { betweenRules: '' },
    suppressStandardClassnames: false,
    ...overrides,
  }) as unknown as TestSchema;

const baseProps = (schemaOverrides: Partial<TestSchema> = {}) => ({
  path: [1],
  level: 1,
  schema: schema(schemaOverrides),
  options: [
    { name: 'and', value: 'and', label: 'AND' },
    { name: 'or', value: 'or', label: 'OR' },
  ] as FullCombinator[],
  value: 'and',
  rules: [],
  ruleGroup: { combinator: 'and', rules: [] },
  handleOnChange: vi.fn(),
  component: ValueSelector as never,
});

describe('InlineCombinator', () => {
  it('wraps the combinator selector in a div with the standard classname', () => {
    const { getByTestId } = render(InlineCombinator, { props: baseProps() });
    const wrapper = getByTestId('inline-combinator');
    expect(wrapper.tagName).toBe('DIV');
    expect(wrapper).toHaveClass('betweenRules');
    expect(wrapper.querySelector('[data-testid="combinators"]')).not.toBeNull();
  });

  it('appends the custom `betweenRules` classname', () => {
    const { getByTestId } = render(InlineCombinator, {
      props: baseProps({ classNames: { betweenRules: 'custom-between' } as never }),
    });
    expect(getByTestId('inline-combinator')).toHaveClass('betweenRules', 'custom-between');
  });

  it('drops the standard classname when suppressed', () => {
    const { getByTestId } = render(InlineCombinator, {
      props: baseProps({ suppressStandardClassnames: true }),
    });
    expect(getByTestId('inline-combinator')).not.toHaveClass('betweenRules');
  });

  it('overrides the testID of the selector with `combinators`', () => {
    const { getByTestId } = render(InlineCombinator, {
      props: { ...baseProps(), testID: 'something-else' },
    });
    expect(getByTestId('combinators')).not.toBeNull();
  });

  it('does not pass `component` through to the selector', () => {
    const seen: Record<string, unknown>[] = [];
    const Probe = defineComponent({
      inheritAttrs: false,
      setup(props) {
        seen.push({ ...props });
        return () => h('div');
      },
    });
    render(InlineCombinator, { props: { ...baseProps(), component: Probe as never } });
    expect(seen[0]).not.toHaveProperty('component');
  });

  it('renders a replacement combinator selector', () => {
    const Replacement = defineComponent({
      inheritAttrs: false,
      setup: () => () => h('span', { 'data-testid': 'replacement' }, 'x'),
    });
    const { getByTestId } = render(InlineCombinator, {
      props: { ...baseProps(), component: Replacement as never },
    });
    expect(getByTestId('replacement')).toBeInTheDocument();
  });
});
