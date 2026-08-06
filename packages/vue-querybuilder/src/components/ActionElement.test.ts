import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import ActionElement from './ActionElement.vue';

const baseProps = () => ({
  path: [0],
  level: 1,
  schema: {} as never,
  ruleOrGroup: { field: 'f1', operator: '=', value: 'v1' },
  handleOnClick: vi.fn(),
});

describe('ActionElement', () => {
  it('renders a button with the label, title, testID, and className', () => {
    const { getByTestId } = render(ActionElement, {
      props: {
        ...baseProps(),
        testID: 'add-rule',
        label: '+ Rule',
        title: 'Add rule',
        className: 'ruleGroup-addRule',
      },
    });
    const button = getByTestId('add-rule');
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('title', 'Add rule');
    expect(button).toHaveClass('ruleGroup-addRule');
    expect(button).toHaveTextContent('+ Rule');
  });

  it('renders a non-string label as arbitrary content, with no wrapper', () => {
    const { getByTestId } = render(ActionElement, {
      props: { ...baseProps(), testID: 'x', label: h('span', { class: 'custom' }, 'Go') },
    });
    const button = getByTestId('x');
    expect(button.childElementCount).toBe(1);
    expect(button.firstElementChild).toHaveClass('custom');
  });

  it('calls handleOnClick with the event', async () => {
    const props = { ...baseProps(), testID: 'x' };
    const { getByTestId } = render(ActionElement, { props });
    await userEvent.click(getByTestId('x'));
    expect(props.handleOnClick).toHaveBeenCalledTimes(1);
    expect(props.handleOnClick.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
  });

  it('is disabled when `disabled` and there is no `disabledTranslation`', () => {
    const { getByTestId } = render(ActionElement, {
      props: { ...baseProps(), testID: 'x', disabled: true },
    });
    expect(getByTestId('x')).toBeDisabled();
  });

  it('stays enabled and swaps label/title when a `disabledTranslation` is given', () => {
    const { getByTestId } = render(ActionElement, {
      props: {
        ...baseProps(),
        testID: 'x',
        disabled: true,
        label: 'Lock',
        title: 'Lock rule',
        disabledTranslation: { label: 'Unlock', title: 'Unlock rule' },
      },
    });
    const button = getByTestId('x');
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent('Unlock');
    expect(button).toHaveAttribute('title', 'Unlock rule');
  });

  it('uses the regular label/title when not disabled', () => {
    const { getByTestId } = render(ActionElement, {
      props: {
        ...baseProps(),
        testID: 'x',
        label: 'Lock',
        title: 'Lock rule',
        disabledTranslation: { label: 'Unlock', title: 'Unlock rule' },
      },
    });
    expect(getByTestId('x')).toHaveTextContent('Lock');
  });

  it('does not let undeclared props fall through as attributes', () => {
    const { getByTestId } = render(ActionElement, {
      props: { ...baseProps(), testID: 'x', rules: [] },
    });
    expect(getByTestId('x')).not.toHaveAttribute('rules');
  });
});
