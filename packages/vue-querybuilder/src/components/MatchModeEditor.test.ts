import type { FullField, MatchConfig, MatchModeOptions } from '@react-querybuilder/core';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import type { Schema } from '../types/schema.js';
import { defaultControlElements } from './defaultControlElements.js';
import MatchModeEditor from './MatchModeEditor.vue';

const schema = () =>
  ({
    controls: defaultControlElements,
    classNames: {},
    suppressStandardClassnames: false,
    parseNumbers: false,
    listsAsArrays: false,
  }) as unknown as Schema<FullField, string>;

const baseProps = (overrides: Record<string, unknown> = {}) => ({
  path: [0],
  level: 1,
  schema: schema(),
  testID: 'match-mode-editor',
  field: 'sub',
  rule: { field: 'sub', operator: '=', value: '' },
  fieldData: { name: 'sub', value: 'sub', label: 'Sub' },
  title: 'Match mode',
  options: [
    { name: 'all', value: 'all', label: 'all' },
    { name: 'atLeast', value: 'atLeast', label: 'at least' },
  ] as MatchModeOptions,
  match: { mode: 'all' } as MatchConfig,
  classNames: { matchMode: 'rule-matchMode', matchThreshold: 'rule-matchThreshold' },
  handleOnChange: vi.fn(),
  ...overrides,
});

describe('MatchModeEditor', () => {
  it('renders only the mode selector for a mode with no threshold', () => {
    const { getAllByTestId } = render(MatchModeEditor, { props: baseProps() });
    const controls = getAllByTestId('match-mode-editor');
    expect(controls).toHaveLength(1);
    expect(controls[0].tagName).toBe('SELECT');
  });

  it('renders both controls under the same testID for a threshold mode', () => {
    const { getAllByTestId } = render(MatchModeEditor, {
      props: baseProps({ match: { mode: 'atLeast', threshold: 2 } }),
    });
    const controls = getAllByTestId('match-mode-editor');
    expect(controls).toHaveLength(2);
    expect(controls[0].tagName).toBe('SELECT');
    expect(controls[1]).toHaveAttribute('type', 'number');
    expect(controls[1]).toHaveValue(2);
  });

  it('recognizes the threshold modes case-insensitively', () => {
    for (const mode of ['atleast', 'ATMOST', 'Exactly']) {
      const { getAllByTestId, unmount } = render(MatchModeEditor, {
        props: baseProps({ match: { mode, threshold: 1 } as MatchConfig }),
      });
      expect(getAllByTestId('match-mode-editor')).toHaveLength(2);
      unmount();
    }
  });

  it('defaults the threshold to 1 and clamps a negative one to 0', () => {
    const { getAllByTestId, unmount } = render(MatchModeEditor, {
      props: baseProps({ match: { mode: 'atLeast' } }),
    });
    expect(getAllByTestId('match-mode-editor')[1]).toHaveValue(1);
    unmount();

    const { getAllByTestId: getAll2 } = render(MatchModeEditor, {
      props: baseProps({ match: { mode: 'atLeast', threshold: -5 } }),
    });
    expect(getAll2('match-mode-editor')[1]).toHaveValue(0);
  });

  it('seeds a threshold when switching into a mode that needs one', async () => {
    const props = baseProps();
    const { getAllByTestId } = render(MatchModeEditor, { props });
    await userEvent.selectOptions(getAllByTestId('match-mode-editor')[0], 'atLeast');
    expect(props.handleOnChange).toHaveBeenCalledExactlyOnceWith({ mode: 'atLeast', threshold: 1 });
  });

  it('keeps an existing threshold when switching modes', async () => {
    const props = baseProps({ match: { mode: 'atLeast', threshold: 7 } });
    const { getAllByTestId } = render(MatchModeEditor, { props });
    await userEvent.selectOptions(getAllByTestId('match-mode-editor')[0], 'all');
    expect(props.handleOnChange).toHaveBeenCalledExactlyOnceWith({ mode: 'all', threshold: 7 });
  });

  it('parses the threshold as a number', async () => {
    const props = baseProps({ match: { mode: 'atLeast', threshold: 2 } });
    const { getAllByTestId } = render(MatchModeEditor, { props });
    const input = getAllByTestId('match-mode-editor')[1];
    await userEvent.clear(input);
    await userEvent.type(input, '5');
    const last = props.handleOnChange.mock.calls.at(-1)![0];
    expect(last).toEqual({ mode: 'atLeast', threshold: 5 });
    expect(typeof last.threshold).toBe('number');
  });

  it('applies the threshold placeholder to the numeric editor', () => {
    const { getAllByTestId } = render(MatchModeEditor, {
      props: baseProps({
        match: { mode: 'atLeast', threshold: 1 },
        thresholdPlaceholder: 'How many?',
      }),
    });
    expect(getAllByTestId('match-mode-editor')[1]).toHaveAttribute('placeholder', 'How many?');
  });

  it('honors replacement selector and numeric editor components', () => {
    const Selector = defineComponent({
      inheritAttrs: false,
      setup: () => () => h('span', { 'data-testid': 'custom-selector' }),
    });
    const Numeric = defineComponent({
      inheritAttrs: false,
      setup: () => () => h('span', { 'data-testid': 'custom-numeric' }),
    });
    const { getByTestId } = render(MatchModeEditor, {
      props: baseProps({
        match: { mode: 'atLeast', threshold: 1 },
        selectorComponent: Selector,
        numericEditorComponent: Numeric,
      }),
    });
    expect(getByTestId('custom-selector')).toBeInTheDocument();
    expect(getByTestId('custom-numeric')).toBeInTheDocument();
  });

  it('disables both controls', () => {
    const { getAllByTestId } = render(MatchModeEditor, {
      props: baseProps({ match: { mode: 'atLeast', threshold: 1 }, disabled: true }),
    });
    for (const c of getAllByTestId('match-mode-editor')) expect(c).toBeDisabled();
  });
});
