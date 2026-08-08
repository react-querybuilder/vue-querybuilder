import type { FullField } from '@react-querybuilder/core';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { h, nextTick } from 'vue';
import type { Schema } from '../types/schema.js';
import ValueEditor from './ValueEditor.vue';
import ValueSelector from './ValueSelector.vue';

const schema = (overrides: Record<string, unknown> = {}) =>
  ({
    classNames: {},
    suppressStandardClassnames: false,
    controls: { valueSelector: ValueSelector },
    ...overrides,
  }) as unknown as Schema<FullField, string>;

const baseProps = (overrides: Record<string, unknown> = {}) => ({
  path: [0],
  level: 1,
  testID: 'value-editor',
  schema: schema(),
  field: 'f1',
  fieldData: { name: 'f1', value: 'f1', label: 'Field 1' },
  operator: '=',
  valueSource: 'value' as const,
  value: 'v1',
  handleOnChange: vi.fn(),
  ...overrides,
});

// `ValueEditorProps` is wider than any single branch needs, so the fixture props are cast where
// they are handed to `render`.
const customSelector = () => h('div', { 'data-testid': 'custom-selector' });

const values = [
  { name: 'v1', value: 'v1', label: 'Value 1' },
  { name: 'v2', value: 'v2', label: 'Value 2' },
];

describe('ValueEditor', () => {
  it('renders a text input by default', async () => {
    const props = baseProps({ className: 'rule-value', title: 'Value' });
    const { getByTestId } = render(ValueEditor, { props: props as never });
    const input = getByTestId('value-editor') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveClass('rule-value');
    expect(input.value).toBe('v1');

    await userEvent.type(input, '2');
    expect(props.handleOnChange).toHaveBeenLastCalledWith('v12');
  });

  it('parses numbers when configured', async () => {
    const props = baseProps({ value: '', inputType: 'number', parseNumbers: true });
    const { getByTestId } = render(ValueEditor, { props: props as never });
    await userEvent.type(getByTestId('value-editor'), '5');
    expect(props.handleOnChange).toHaveBeenLastCalledWith(5);
  });

  it('renders nothing for unary operators', () => {
    const { queryByTestId } = render(ValueEditor, {
      props: baseProps({ operator: 'null' }) as never,
    });
    expect(queryByTestId('value-editor')).toBeNull();
  });

  it('renders paired text inputs and the separator for "between"', async () => {
    const props = baseProps({
      operator: 'between',
      value: 'a,b',
      separator: h('span', { class: 'sep' }, 'and'),
      className: 'rule-value',
    });
    const { getByTestId } = render(ValueEditor, { props: props as never });
    const span = getByTestId('value-editor');
    expect(span.tagName).toBe('SPAN');
    const inputs = span.querySelectorAll('input');
    expect(inputs).toHaveLength(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('a');
    expect((inputs[1] as HTMLInputElement).value).toBe('b');
    expect(span.querySelector('.sep')).toHaveTextContent('and');

    await userEvent.type(inputs[1], 'c');
    expect(props.handleOnChange).toHaveBeenLastCalledWith('a,bc');
  });

  it('renders paired selectors for "between" with a select type', async () => {
    const props = baseProps({ operator: 'between', type: 'select', values, value: 'v1,v2' });
    const { getByTestId } = render(ValueEditor, { props: props as never });
    const selects = getByTestId('value-editor').querySelectorAll('select');
    expect(selects).toHaveLength(2);
    // Mirrors React: the wrapping `<span>` carries the testID; the nested selectors do not.
    expect(selects[0]).not.toHaveAttribute('data-testid');

    await userEvent.selectOptions(selects[0], 'v2');
    expect(props.handleOnChange).toHaveBeenLastCalledWith('v2,v2');
  });

  it('renders a select', async () => {
    const props = baseProps({ type: 'select', values });
    const { getByTestId } = render(ValueEditor, { props: props as never });
    const select = getByTestId('value-editor') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select.multiple).toBe(false);

    await userEvent.selectOptions(select, 'v2');
    expect(props.handleOnChange).toHaveBeenLastCalledWith('v2');
  });

  it('renders a multiselect', () => {
    const { getByTestId } = render(ValueEditor, {
      props: baseProps({ type: 'multiselect', values, value: 'v1' }) as never,
    });
    expect((getByTestId('value-editor') as HTMLSelectElement).multiple).toBe(true);
  });

  it('renders a multiselect for the "in" operator and leaves the array value intact', async () => {
    const props = baseProps({
      operator: 'in',
      type: 'multiselect',
      values,
      value: ['v1'],
      listsAsArrays: true,
    });
    const { getByTestId } = render(ValueEditor, { props: props as never });
    const select = getByTestId('value-editor') as HTMLSelectElement;
    expect(select.multiple).toBe(true);

    await userEvent.selectOptions(select, ['v1', 'v2']);
    expect(props.handleOnChange).toHaveBeenLastCalledWith(['v1', 'v2']);

    // `in` + `multiselect` is reset-exempt: the array survives the post-mount reset run.
    props.handleOnChange.mockClear();
    await nextTick();
    expect(props.handleOnChange).not.toHaveBeenCalled();
  });

  it('renders a textarea', async () => {
    const props = baseProps({ type: 'textarea' });
    const { getByTestId } = render(ValueEditor, { props: props as never });
    const textarea = getByTestId('value-editor') as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.value).toBe('v1');

    await userEvent.type(textarea, '!');
    expect(props.handleOnChange).toHaveBeenLastCalledWith('v1!');
  });

  it.each(['checkbox', 'switch'])('renders a %s', async type => {
    const props = baseProps({ type, value: false });
    const { getByTestId } = render(ValueEditor, { props: props as never });
    const input = getByTestId('value-editor') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'checkbox');
    expect(input.checked).toBe(false);

    await userEvent.click(input);
    expect(props.handleOnChange).toHaveBeenLastCalledWith(true);
  });

  it('renders a radio button set with unique, associated ids', async () => {
    const props = baseProps({ type: 'radio', values });
    const { getByTestId, getByLabelText } = render(ValueEditor, { props: props as never });
    const span = getByTestId('value-editor');
    const inputs = [...span.querySelectorAll('input')];
    expect(inputs).toHaveLength(2);
    expect(new Set(inputs.map(i => i.id)).size).toBe(2);
    expect((inputs[0] as HTMLInputElement).checked).toBe(true);

    await userEvent.click(getByLabelText('Value 2'));
    expect(props.handleOnChange).toHaveBeenLastCalledWith('v2');
  });

  it('renders a bigint editor keyed off the uncoerced inputType', async () => {
    const props = baseProps({ inputType: 'bigint', value: 10n, parseNumbers: true });
    const { getByTestId } = render(ValueEditor, { props: props as never });
    const input = getByTestId('value-editor') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'text');
    expect(input.value).toBe('10');

    await userEvent.type(input, '1');
    expect(props.handleOnChange).toHaveBeenLastCalledWith(101n);
  });

  it('uses the field placeholder', () => {
    const { getByTestId } = render(ValueEditor, {
      props: baseProps({
        fieldData: { name: 'f1', value: 'f1', label: 'Field 1', placeholder: 'Enter a value' },
      }) as never,
    });
    expect(getByTestId('value-editor')).toHaveAttribute('placeholder', 'Enter a value');
  });

  it('prefers an explicit selectorComponent over the one in the schema', () => {
    const { getByTestId } = render(ValueEditor, {
      props: baseProps({ type: 'select', values, selectorComponent: customSelector }) as never,
    });
    expect(getByTestId('custom-selector')).toBeInTheDocument();
  });

  it('runs the reset effect after mount, not before', async () => {
    const props = baseProps({ operator: '=', value: ['a', 'b'] });
    render(ValueEditor, { props: props as never });
    expect(props.handleOnChange).not.toHaveBeenCalled();

    await nextTick();
    expect(props.handleOnChange).toHaveBeenCalledWith('a');
  });

  it('skips the reset effect when skipHook is true', async () => {
    const props = baseProps({ operator: '=', value: ['a', 'b'], skipHook: true });
    render(ValueEditor, { props: props as never });
    await nextTick();
    expect(props.handleOnChange).not.toHaveBeenCalled();
  });

  // The cross-implementation anchor for the reset is `classnames-post-flush.json`, but upstream's
  // mount-query-change effect clobbers the *mount-time* reset, so no fixture case can observe it
  // (see RQB_POST-FLUSH_CONFORMANCE.md §5). A post-mount operator change is the reachable path,
  // and this is the assertion that stands in for the fixture gate.
  it.each([
    ['in', { operator: 'in', value: ['a', 'b'] }, 'a'],
    ['between', { operator: 'between', value: '10,20', inputType: 'number' }, '10'],
  ])(
    'collapses the value when the operator changes from %s to a scalar',
    async (_label, overrides, collapsed) => {
      const props = baseProps(overrides);
      const { rerender } = render(ValueEditor, { props: props as never });
      await nextTick();
      expect(props.handleOnChange).not.toHaveBeenCalled();

      await rerender({ ...props, operator: '=' } as never);
      await nextTick();
      expect(props.handleOnChange).toHaveBeenCalledWith(collapsed);
    }
  );
});
