import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import ValueSelector from './ValueSelector.vue';

const options = [
  { name: 'f1', value: 'f1', label: 'Field 1' },
  { name: 'f2', value: 'f2', label: 'Field 2' },
];

const optionGroups = [
  { label: 'Group 1', options: [{ name: 'g1f1', value: 'g1f1', label: 'Group 1, Field 1' }] },
  {
    label: 'Group 2',
    options: [{ name: 'g2f1', value: 'g2f1', label: 'Group 2, Field 1', disabled: true }],
  },
];

const baseProps = () => ({
  path: [0],
  level: 1,
  schema: {} as never,
  options,
  value: 'f1',
  handleOnChange: vi.fn(),
});

describe('ValueSelector', () => {
  it('renders a select with the testID, className, title, and options', () => {
    const { getByTestId } = render(ValueSelector, {
      props: { ...baseProps(), testID: 'fields', className: 'rule-fields', title: 'Field' },
    });
    const select = getByTestId('fields') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select).toHaveClass('rule-fields');
    expect(select).toHaveAttribute('title', 'Field');
    expect([...select.options].map(o => o.value)).toEqual(['f1', 'f2']);
    expect(select.value).toBe('f1');
  });

  it('renders optgroups', () => {
    const { getByTestId } = render(ValueSelector, {
      props: { ...baseProps(), testID: 'fields', options: optionGroups, value: 'g1f1' },
    });
    const select = getByTestId('fields') as HTMLSelectElement;
    expect([...select.querySelectorAll('optgroup')].map(og => og.label)).toEqual([
      'Group 1',
      'Group 2',
    ]);
    expect(select.querySelector('option[value="g2f1"]')).toBeDisabled();
  });

  it('renders nothing for a non-array option list', () => {
    const { getByTestId } = render(ValueSelector, {
      props: { ...baseProps(), testID: 'fields', options: undefined as never },
    });
    expect((getByTestId('fields') as HTMLSelectElement).options).toHaveLength(0);
  });

  it('calls handleOnChange with the selected value', async () => {
    const props = { ...baseProps(), testID: 'fields' };
    const { getByTestId } = render(ValueSelector, { props });
    await userEvent.selectOptions(getByTestId('fields'), 'f2');
    expect(props.handleOnChange).toHaveBeenCalledWith('f2');
  });

  it('marks each selected option and reports a comma-separated list when multiple', async () => {
    const props = { ...baseProps(), testID: 'fields', multiple: true, value: 'f1,f2' };
    const { getByTestId } = render(ValueSelector, { props });
    const select = getByTestId('fields') as HTMLSelectElement;
    expect(select.multiple).toBe(true);
    expect([...select.selectedOptions].map(o => o.value)).toEqual(['f1', 'f2']);

    await userEvent.deselectOptions(select, 'f1');
    expect(props.handleOnChange).toHaveBeenCalledWith('f2');
  });

  it('reports an array when multiple and listsAsArrays', async () => {
    const props = {
      ...baseProps(),
      testID: 'fields',
      multiple: true,
      listsAsArrays: true,
      value: '',
    };
    const { getByTestId } = render(ValueSelector, { props });
    await userEvent.selectOptions(getByTestId('fields'), 'f2');
    expect(props.handleOnChange).toHaveBeenCalledWith(['f2']);
  });

  it('does not let undeclared props fall through as attributes', () => {
    const { getByTestId } = render(ValueSelector, {
      props: { ...baseProps(), testID: 'fields', rule: { field: 'f1' } } as never,
    });
    expect(getByTestId('fields')).not.toHaveAttribute('rule');
  });
});
