import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import NotToggle from './NotToggle.vue';

const baseProps = () => ({
  path: [],
  level: 0,
  schema: {} as never,
  ruleGroup: { combinator: 'and', rules: [] },
  handleOnChange: vi.fn(),
});

describe('NotToggle', () => {
  it('renders a label wrapping a checkbox, with the testID, className, and title', () => {
    const { getByTestId } = render(NotToggle, {
      props: {
        ...baseProps(),
        testID: 'not-toggle',
        className: 'ruleGroup-notToggle',
        title: 'Invert this group',
        label: 'Not',
      },
    });
    const label = getByTestId('not-toggle');
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveClass('ruleGroup-notToggle');
    expect(label).toHaveAttribute('title', 'Invert this group');
    expect(label).toHaveTextContent('Not');
    expect(label.querySelector('input')).toHaveAttribute('type', 'checkbox');
  });

  it('associates the label with the checkbox', () => {
    const { getByTestId } = render(NotToggle, {
      props: { ...baseProps(), testID: 'not-toggle', label: 'Not' },
    });
    const label = getByTestId('not-toggle') as HTMLLabelElement;
    const input = label.querySelector('input')!;
    expect(input.id).toBeTruthy();
    expect(label.getAttribute('for')).toBe(input.id);
    expect(input).toHaveAccessibleName('Not');
  });

  it('reflects `checked`', () => {
    const { getByTestId, rerender } = render(NotToggle, {
      props: { ...baseProps(), testID: 'x', checked: true },
    });
    expect(getByTestId('x').querySelector('input')).toBeChecked();
    return rerender({ ...baseProps(), testID: 'x', checked: false }).then(() => {
      expect(getByTestId('x').querySelector('input')).not.toBeChecked();
    });
  });

  it('calls handleOnChange with the new checked state', async () => {
    const props = { ...baseProps(), testID: 'x' };
    const { getByTestId } = render(NotToggle, { props });
    await userEvent.click(getByTestId('x').querySelector('input')!);
    expect(props.handleOnChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('disables the checkbox', () => {
    const { getByTestId } = render(NotToggle, {
      props: { ...baseProps(), testID: 'x', disabled: true },
    });
    expect(getByTestId('x').querySelector('input')).toBeDisabled();
  });

  it('renders a non-string label as arbitrary content', () => {
    const { getByTestId } = render(NotToggle, {
      props: { ...baseProps(), testID: 'x', label: h('span', { class: 'custom' }, 'Not') },
    });
    expect(getByTestId('x').querySelector('span.custom')).not.toBeNull();
  });

  it('emits no whitespace between the checkbox and the label', () => {
    const { getByTestId } = render(NotToggle, {
      props: { ...baseProps(), testID: 'x', label: 'Not' },
    });
    // React renders `<label><input/>Not</label>`. A whitespace-only text node either side of
    // the checkbox would break DOM parity, so assert the child nodes exactly.
    const nodes = [...getByTestId('x').childNodes];
    expect(nodes).toHaveLength(2);
    expect((nodes[0] as Element).tagName).toBe('INPUT');
    expect(nodes[1].nodeType).toBe(Node.TEXT_NODE);
    expect(nodes[1].textContent).toBe('Not');
  });

  // Attribute fallthrough is enabled, so a consumer-supplied attribute reaches the DOM and a
  // consumer-supplied `class` merges with the control's own. Nothing the port passes internally
  // strays here; `controlProps.test.ts` is the gate for that.
  it('passes consumer-supplied attributes through to the root element', () => {
    const { getByTestId } = render(NotToggle, {
      props: { ...baseProps(), className: 'own-cn', testID: 'x' },
      attrs: { id: 'consumer-id', class: 'consumer-cn' },
    });
    const el = getByTestId('x');
    expect(el).toHaveAttribute('id', 'consumer-id');
    expect(el).toHaveClass('own-cn', 'consumer-cn');
  });
});
