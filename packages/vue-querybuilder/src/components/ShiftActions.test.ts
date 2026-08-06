import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import ShiftActions from './ShiftActions.vue';

const baseProps = () => ({
  path: [0],
  level: 1,
  schema: {} as never,
  ruleOrGroup: { field: 'f1', operator: '=', value: 'v1' },
  shiftUp: vi.fn(),
  shiftDown: vi.fn(),
});

const buttons = (el: HTMLElement) => [...el.querySelectorAll('button')];

describe('ShiftActions', () => {
  it('renders two buttons with the labels and titles, in up-then-down order', () => {
    const { getByTestId } = render(ShiftActions, {
      props: {
        ...baseProps(),
        testID: 'shift-actions',
        className: 'ruleGroup-shiftActions',
        labels: { shiftUp: '˄', shiftDown: '˅' },
        titles: { shiftUp: 'Shift up', shiftDown: 'Shift down' },
      },
    });
    const container = getByTestId('shift-actions');
    expect(container.tagName).toBe('DIV');
    expect(container).toHaveClass('ruleGroup-shiftActions');
    const [up, down] = buttons(container);
    expect(up).toHaveAttribute('type', 'button');
    expect(up).toHaveAttribute('title', 'Shift up');
    expect(up).toHaveTextContent('˄');
    expect(down).toHaveAttribute('title', 'Shift down');
    expect(down).toHaveTextContent('˅');
  });

  it('forwards the click event, so `altKey` reaches the action', async () => {
    const props = { ...baseProps(), testID: 'x' };
    const { getByTestId } = render(ShiftActions, { props });
    const [up, down] = buttons(getByTestId('x'));
    await userEvent.click(up);
    await userEvent.click(down);
    expect(props.shiftUp).toHaveBeenCalledTimes(1);
    expect(props.shiftUp.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
    expect(props.shiftDown).toHaveBeenCalledTimes(1);
    expect(props.shiftDown.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
  });

  it('disables each button independently', () => {
    const { getByTestId } = render(ShiftActions, {
      props: { ...baseProps(), testID: 'x', shiftUpDisabled: true },
    });
    const [up, down] = buttons(getByTestId('x'));
    expect(up).toBeDisabled();
    expect(down).not.toBeDisabled();
  });

  it('disables both buttons when the whole control is disabled', () => {
    const { getByTestId } = render(ShiftActions, {
      props: { ...baseProps(), testID: 'x', disabled: true },
    });
    for (const b of buttons(getByTestId('x'))) expect(b).toBeDisabled();
  });

  it('renders without handlers', async () => {
    const { getByTestId } = render(ShiftActions, {
      props: { ...baseProps(), testID: 'x', shiftUp: undefined, shiftDown: undefined },
    });
    await userEvent.click(buttons(getByTestId('x'))[0]);
    expect(getByTestId('x')).toBeInTheDocument();
  });

  it('does not let undeclared props fall through as attributes', () => {
    const { getByTestId } = render(ShiftActions, {
      props: { ...baseProps(), testID: 'x' },
      attrs: { rules: [] },
    });
    expect(getByTestId('x')).not.toHaveAttribute('rules');
  });
});
