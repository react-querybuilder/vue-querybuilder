import { render } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import type { LabelNode } from '../types/translations.js';
import { Label } from './Label.js';

const renderLabel = (label?: LabelNode | null) =>
  render(
    defineComponent({ render: () => h('div', { 'data-testid': 'host' }, [h(Label, { label })]) })
  );

describe('Label', () => {
  it('renders a string with no wrapper element', () => {
    const { getByTestId } = renderLabel('Add rule');
    const host = getByTestId('host');
    expect(host).toHaveTextContent('Add rule');
    expect(host.childElementCount).toBe(0);
  });

  it('renders arbitrary content as given', () => {
    const { getByTestId } = renderLabel(h('span', { class: 'custom' }, 'Add rule'));
    const host = getByTestId('host');
    expect(host.childElementCount).toBe(1);
    expect(host.firstElementChild).toHaveClass('custom');
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
  ])('renders nothing for %s', (_name, label) => {
    const { getByTestId } = renderLabel(label);
    expect(getByTestId('host').textContent).toBe('');
  });

  it('emits no whitespace of its own', () => {
    const { getByTestId } = renderLabel('x');
    expect(getByTestId('host').innerHTML).toBe('x');
  });
});
