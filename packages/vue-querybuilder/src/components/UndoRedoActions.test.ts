import type { FullField } from '@react-querybuilder/core';
import { QueryManager } from '@react-querybuilder/core';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import type { Schema } from '../types/schema.js';
import { defaultControlElements } from './defaultControlElements.js';
import UndoRedoActions from './UndoRedoActions.vue';

const setup = (overrides: Record<string, unknown> = {}) => {
  const manager = new QueryManager(
    { combinator: 'and', rules: [{ field: 'f1', operator: '=', value: 'v1' }] },
    { history: true }
  );
  manager.clearHistory();

  const props = () => ({
    path: [],
    level: 0,
    testID: 'undo-redo-actions',
    className: 'ruleGroup-undoRedoActions',
    schema: { manager, controls: defaultControlElements } as unknown as Schema<FullField, string>,
    ruleOrGroup: manager.getQuery(),
    labels: { undo: '↶', redo: '↷' },
    titles: { undo: 'Undo', redo: 'Redo' },
    classNames: { undo: 'undo-cn', redo: 'redo-cn' },
    ...overrides,
  });

  return { manager, props };
};

describe('UndoRedoActions', () => {
  it('renders undo and redo buttons in a container', () => {
    const { props } = setup();
    const { getByTestId } = render(UndoRedoActions, { props: props() });
    const container = getByTestId('undo-redo-actions');
    expect(container.tagName).toBe('DIV');
    expect(container).toHaveClass('ruleGroup-undoRedoActions');
    const undo = getByTestId('undo-action');
    const redo = getByTestId('redo-action');
    expect(undo).toHaveAttribute('title', 'Undo');
    expect(undo).toHaveTextContent('↶');
    expect(undo).toHaveClass('undo-cn');
    expect(redo).toHaveAttribute('title', 'Redo');
    expect(redo).toHaveTextContent('↷');
    expect(redo).toHaveClass('redo-cn');
    // Document order: undo before redo.
    expect(undo.compareDocumentPosition(redo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('disables both buttons when there is no history', () => {
    const { props } = setup();
    const { getByTestId } = render(UndoRedoActions, { props: props() });
    expect(getByTestId('undo-action')).toBeDisabled();
    expect(getByTestId('redo-action')).toBeDisabled();
  });

  it('enables undo once the query has changed, and drives the manager', async () => {
    const { manager, props } = setup();
    const { getByTestId, rerender } = render(UndoRedoActions, { props: props() });

    manager.update('value', 'changed', [0]);
    // `ruleOrGroup` is replaced on every commit; that is what re-evaluates `canUndo`/`canRedo`.
    await rerender(props());
    expect(getByTestId('undo-action')).not.toBeDisabled();
    expect(getByTestId('redo-action')).toBeDisabled();

    await userEvent.click(getByTestId('undo-action'));
    expect(manager.getQuery().rules[0]).toMatchObject({ value: 'v1' });

    await rerender(props());
    await nextTick();
    expect(getByTestId('redo-action')).not.toBeDisabled();

    await userEvent.click(getByTestId('redo-action'));
    expect(manager.getQuery().rules[0]).toMatchObject({ value: 'changed' });
  });

  it('stays disabled when the control itself is disabled', async () => {
    const { manager, props } = setup();
    manager.update('value', 'changed', [0]);
    const { getByTestId } = render(UndoRedoActions, { props: { ...props(), disabled: true } });
    expect(getByTestId('undo-action')).toBeDisabled();
    expect(getByTestId('redo-action')).toBeDisabled();
  });

  it('renders through a replacement `actionElement`', () => {
    const { props } = setup();
    const Replacement = defineComponent({
      inheritAttrs: false,
      props: { testID: { type: String, default: '' } },
      setup: p => () => h('span', { 'data-testid': `custom-${p.testID}` }),
    });
    const base = props();
    const { getByTestId } = render(UndoRedoActions, {
      props: {
        ...base,
        schema: {
          ...(base.schema as object),
          controls: { ...defaultControlElements, actionElement: Replacement },
        } as unknown as Schema<FullField, string>,
      },
    });
    expect(getByTestId('custom-undo-action')).toBeInTheDocument();
    expect(getByTestId('custom-redo-action')).toBeInTheDocument();
  });
});
