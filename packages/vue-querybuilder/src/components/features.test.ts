import type { RuleGroupType, RuleGroupTypeIC } from '@react-querybuilder/core';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { testFields } from '../../test/support.js';
import QueryBuilder from './QueryBuilder.vue';

/**
 * The full feature surface. Everything here is cheap — core does the work —
 * so the point is to pin that each feature is actually wired up, not to re-test core.
 */

const flat: RuleGroupType = {
  combinator: 'and',
  rules: [
    { id: 'r0', field: 'firstName', operator: '=', value: 'Steve' },
    { id: 'r1', field: 'lastName', operator: '=', value: 'Vai' },
    { id: 'r2', field: 'age', operator: '=', value: '26' },
  ],
};

const ic: RuleGroupTypeIC = {
  rules: [
    { id: 'r0', field: 'firstName', operator: '=', value: 'Steve' },
    'and',
    { id: 'r1', field: 'lastName', operator: '=', value: 'Vai' },
  ],
};

const renderQB = (props: Record<string, unknown> = {}) =>
  render(QueryBuilder, { props: { fields: testFields, ...props } });

describe('feature surface', () => {
  describe('independent combinators', () => {
    it('renders an inline combinator per combinator slot and none in the header', () => {
      const { container, getAllByTestId } = renderQB({ defaultQuery: ic });
      expect(getAllByTestId('inline-combinator')).toHaveLength(1);
      expect(container.querySelector('.ruleGroup-header [data-testid="combinators"]')).toBeNull();
    });

    it('sets the root `data-inlinecombinators` attribute', () => {
      const { container } = renderQB({ defaultQuery: ic });
      expect(container.querySelector('div[role="form"]')).toHaveAttribute(
        'data-inlinecombinators',
        'enabled'
      );
    });

    it('updates only the combinator slot that changed', async () => {
      const onQueryChange = vi.fn();
      const { getByTestId } = renderQB({ defaultQuery: ic, onQueryChange });
      onQueryChange.mockClear();
      await userEvent.selectOptions(getByTestId('combinators'), 'or');
      const latest = onQueryChange.mock.calls.at(-1)![0] as RuleGroupTypeIC;
      expect(latest.rules[1]).toBe('or');
    });
  });

  describe('showCombinatorsBetweenRules', () => {
    it('moves the combinator out of the header and between the rules', () => {
      const { container, getAllByTestId } = renderQB({
        defaultQuery: flat,
        showCombinatorsBetweenRules: true,
      });
      // Three rules, so two gaps.
      expect(getAllByTestId('inline-combinator')).toHaveLength(2);
      expect(container.querySelector('.ruleGroup-header [data-testid="combinators"]')).toBeNull();
    });

    it('changes the group combinator from any of the inline selectors', async () => {
      const onQueryChange = vi.fn();
      const { getAllByTestId } = renderQB({
        defaultQuery: flat,
        showCombinatorsBetweenRules: true,
        onQueryChange,
      });
      onQueryChange.mockClear();
      await userEvent.selectOptions(getAllByTestId('combinators')[1], 'or');
      expect((onQueryChange.mock.calls.at(-1)![0] as RuleGroupType).combinator).toBe('or');
    });
  });

  describe('showNotToggle', () => {
    it('toggles `not` on the group', async () => {
      const onQueryChange = vi.fn();
      const { getByTestId } = renderQB({ defaultQuery: flat, showNotToggle: true, onQueryChange });
      onQueryChange.mockClear();
      await userEvent.click(getByTestId('not-toggle').querySelector('input')!);
      expect((onQueryChange.mock.calls.at(-1)![0] as RuleGroupType).not).toBe(true);
    });

    it('marks a negated group with `data-not`', () => {
      const { getByTestId } = renderQB({
        defaultQuery: { ...flat, not: true },
        showNotToggle: true,
      });
      expect(getByTestId('rule-group')).toHaveAttribute('data-not', 'true');
    });
  });

  describe('showShiftActions', () => {
    it('disables shift-up on the first rule and shift-down on the last', () => {
      const { getAllByTestId } = renderQB({ defaultQuery: flat, showShiftActions: true });
      const groups = getAllByTestId('shift-actions');
      const [firstUp] = groups[0].querySelectorAll('button');
      const lastDown = groups.at(-1)!.querySelectorAll('button')[1];
      expect(firstUp).toBeDisabled();
      expect(lastDown).toBeDisabled();
    });

    it('shifts a rule down', async () => {
      const onQueryChange = vi.fn();
      const { getAllByTestId } = renderQB({
        defaultQuery: flat,
        showShiftActions: true,
        onQueryChange,
      });
      onQueryChange.mockClear();
      await userEvent.click(getAllByTestId('shift-actions')[0].querySelectorAll('button')[1]);
      const latest = onQueryChange.mock.calls.at(-1)![0] as RuleGroupType;
      expect(latest.rules.map(r => (r as { id: string }).id)).toEqual(['r1', 'r0', 'r2']);
    });

    it('shifts a rule up', async () => {
      const onQueryChange = vi.fn();
      const { getAllByTestId } = renderQB({
        defaultQuery: flat,
        showShiftActions: true,
        onQueryChange,
      });
      onQueryChange.mockClear();
      await userEvent.click(getAllByTestId('shift-actions')[1].querySelectorAll('button')[0]);
      const latest = onQueryChange.mock.calls.at(-1)![0] as RuleGroupType;
      expect(latest.rules.map(r => (r as { id: string }).id)).toEqual(['r1', 'r0', 'r2']);
    });

    it('omits shift actions on the root group', () => {
      const { container } = renderQB({ defaultQuery: flat, showShiftActions: true });
      const header = container.querySelector('.ruleGroup-header')!;
      expect(header.querySelector('[data-testid="shift-actions"]')).toBeNull();
    });
  });

  describe('undo/redo', () => {
    it('renders only in the outermost group', () => {
      const { getAllByTestId, container } = renderQB({
        defaultQuery: { combinator: 'and', rules: [{ combinator: 'or', rules: [] }] },
        showUndoRedo: true,
      });
      expect(getAllByTestId('undo-redo-actions')).toHaveLength(1);
      expect(
        container.querySelector('[data-level="1"] [data-testid="undo-redo-actions"]')
      ).toBeNull();
    });

    it('starts disabled, then undoes a change', async () => {
      const { getByTestId, getAllByTestId } = renderQB({ defaultQuery: flat, showUndoRedo: true });
      expect(getByTestId('undo-action')).toBeDisabled();

      await userEvent.click(getAllByTestId('remove-rule')[0]);
      await nextTick();
      expect(getAllByTestId('rule')).toHaveLength(2);
      expect(getByTestId('undo-action')).not.toBeDisabled();

      await userEvent.click(getByTestId('undo-action'));
      await nextTick();
      expect(getAllByTestId('rule')).toHaveLength(3);

      await userEvent.click(getByTestId('redo-action'));
      await nextTick();
      expect(getAllByTestId('rule')).toHaveLength(2);
    });
  });

  describe('clone, lock, and mute buttons', () => {
    it('clones a rule directly after itself', async () => {
      const onQueryChange = vi.fn();
      const { getAllByTestId } = renderQB({
        defaultQuery: flat,
        showCloneButtons: true,
        onQueryChange,
      });
      onQueryChange.mockClear();
      await userEvent.click(getAllByTestId('clone-rule')[0]);
      const latest = onQueryChange.mock.calls.at(-1)![0] as RuleGroupType;
      expect(latest.rules).toHaveLength(4);
      expect(latest.rules[1]).toMatchObject({ field: 'firstName', value: 'Steve' });
    });

    it('locks a rule, and the lock button stays clickable so it can be unlocked', async () => {
      const onQueryChange = vi.fn();
      const { getAllByTestId } = renderQB({
        defaultQuery: flat,
        showLockButtons: true,
        onQueryChange,
      });
      onQueryChange.mockClear();
      await userEvent.click(getAllByTestId('lock-rule')[0]);
      await nextTick();
      expect((onQueryChange.mock.calls.at(-1)![0] as RuleGroupType).rules[0]).toMatchObject({
        disabled: true,
      });
      expect(getAllByTestId('lock-rule')[0]).not.toBeDisabled();

      await userEvent.click(getAllByTestId('lock-rule')[0]);
      expect((onQueryChange.mock.calls.at(-1)![0] as RuleGroupType).rules[0]).toMatchObject({
        disabled: false,
      });
    });

    it('mutes a rule and swaps the button label', async () => {
      const onQueryChange = vi.fn();
      const { getAllByTestId } = renderQB({
        defaultQuery: flat,
        showMuteButtons: true,
        onQueryChange,
      });
      const before = getAllByTestId('mute-rule')[0].getAttribute('title');
      await userEvent.click(getAllByTestId('mute-rule')[0]);
      await nextTick();
      expect((onQueryChange.mock.calls.at(-1)![0] as RuleGroupType).rules[0]).toMatchObject({
        muted: true,
      });
      expect(getAllByTestId('mute-rule')[0].getAttribute('title')).not.toBe(before);
    });
  });

  describe('showUngroupButtons', () => {
    const nested: RuleGroupType = {
      combinator: 'and',
      rules: [
        { id: 'r0', field: 'firstName', operator: '=', value: 'Steve' },
        {
          id: 'g1',
          combinator: 'or',
          rules: [
            { id: 'r1', field: 'lastName', operator: '=', value: 'Vai' },
            { id: 'r2', field: 'age', operator: '=', value: '26' },
          ],
        },
      ],
    };

    it('renders no ungroup button by default', () => {
      const { queryAllByTestId } = renderQB({ defaultQuery: nested });
      expect(queryAllByTestId('ungroup')).toHaveLength(0);
    });

    it('renders one per non-root group — the root has no parent to absorb its rules', () => {
      const { getAllByTestId, queryAllByTestId } = renderQB({
        defaultQuery: nested,
        showUngroupButtons: true,
      });
      expect(queryAllByTestId('rule-group')).toHaveLength(2);
      const buttons = getAllByTestId('ungroup');
      expect(buttons).toHaveLength(1);
      expect(buttons[0].closest('[data-path]')).toHaveAttribute('data-path', '[1]');
    });

    it('replaces the group with its own rules, in place', async () => {
      const onQueryChange = vi.fn();
      const { getByTestId } = renderQB({
        defaultQuery: nested,
        showUngroupButtons: true,
        onQueryChange,
      });
      onQueryChange.mockClear();
      await userEvent.click(getByTestId('ungroup'));
      const latest = onQueryChange.mock.calls.at(-1)![0] as RuleGroupType;
      expect(latest.rules.map(r => (r as { id: string }).id)).toEqual(['r0', 'r1', 'r2']);
    });

    it('does nothing when the group is disabled', async () => {
      const onQueryChange = vi.fn();
      const { getByTestId } = renderQB({
        defaultQuery: nested,
        showUngroupButtons: true,
        disabled: [[1]],
        onQueryChange,
      });
      onQueryChange.mockClear();
      await userEvent.click(getByTestId('ungroup'));
      await nextTick();
      expect(onQueryChange).not.toHaveBeenCalled();
    });

    it('is vetoed by onUngroup returning false', async () => {
      const onQueryChange = vi.fn();
      const onUngroup = vi.fn(() => false);
      const { getByTestId } = renderQB({
        defaultQuery: nested,
        showUngroupButtons: true,
        onUngroup,
        onQueryChange,
      });
      onQueryChange.mockClear();
      await userEvent.click(getByTestId('ungroup'));
      await nextTick();
      expect(onUngroup).toHaveBeenCalledTimes(1);
      expect(onQueryChange).not.toHaveBeenCalled();
    });

    it('renders through a keyed `ungroupAction` override', () => {
      const { getByTestId, queryAllByTestId } = renderQB({
        defaultQuery: nested,
        showUngroupButtons: true,
        controlElements: {
          ungroupAction: defineComponent({
            props: { label: { type: null, default: undefined } },
            template: `<span data-testid="custom-ungroup">{{ label }}</span>`,
          }),
        },
      });
      expect(queryAllByTestId('ungroup')).toHaveLength(0);
      expect(getByTestId('custom-ungroup')).toHaveTextContent('⊟');
    });
  });

  describe('maxLevels', () => {
    it('hides the add-group button at the deepest allowed level', () => {
      const { getAllByTestId } = renderQB({
        defaultQuery: { combinator: 'and', rules: [{ combinator: 'or', rules: [] }] },
        maxLevels: 1,
      });
      // Root can add a group; the level-1 group cannot.
      expect(getAllByTestId('add-group')).toHaveLength(1);
    });
  });

  describe('validation', () => {
    it('applies invalid classes from the validation map', () => {
      const { getAllByTestId } = renderQB({
        defaultQuery: flat,
        validator: () => ({ r0: false, r1: { valid: true } }),
      });
      const rules = getAllByTestId('rule');
      expect(rules[0]).toHaveClass('queryBuilder-invalid');
      expect(rules[1]).toHaveClass('queryBuilder-valid');
    });
  });

  describe('accessibleDescriptionGenerator', () => {
    it('titles each group with the generated description', () => {
      const { getAllByTestId } = renderQB({
        defaultQuery: { combinator: 'and', rules: [{ combinator: 'or', rules: [] }] },
        accessibleDescriptionGenerator: ({ path }: { path: number[] }) =>
          path.length === 0 ? 'Root' : `Group ${path.join('.')}`,
      });
      expect(getAllByTestId('rule-group')[0]).toHaveAttribute('title', 'Root');
      expect(getAllByTestId('rule-group')[1]).toHaveAttribute('title', 'Group 0');
    });
  });

  describe('disabled and disabledPaths', () => {
    it('disables every control when `disabled` is true', () => {
      const { container } = renderQB({ defaultQuery: flat, disabled: true });
      for (const control of container.querySelectorAll('select,input,button')) {
        expect(control).toBeDisabled();
      }
    });

    it('disables only the listed paths when `disabled` is an array', () => {
      const { getAllByTestId } = renderQB({ defaultQuery: flat, disabled: [[0]] });
      const rules = getAllByTestId('rule');
      expect(rules[0].querySelector('select')).toBeDisabled();
      expect(rules[1].querySelector('select')).not.toBeDisabled();
    });

    it('inherits a group\u2019s disabled state into its children', () => {
      const { getAllByTestId } = renderQB({
        defaultQuery: {
          combinator: 'and',
          rules: [{ combinator: 'or', disabled: true, rules: [flat.rules[0]] }],
        },
      });
      expect(getAllByTestId('rule')[0].querySelector('select')).toBeDisabled();
    });
  });

  describe('suppressStandardClassnames', () => {
    it('drops every standard classname but keeps the custom ones', () => {
      const { container, getByTestId } = renderQB({
        defaultQuery: flat,
        showCombinatorsBetweenRules: true,
        suppressStandardClassnames: true,
        controlClassnames: { queryBuilder: 'custom-qb', betweenRules: 'custom-between' },
      });
      const root = container.querySelector('div[role="form"]')!;
      expect(root).toHaveClass('custom-qb');
      expect(root).not.toHaveClass('queryBuilder');
      expect(getByTestId('rule-group')).not.toHaveClass('ruleGroup');
      expect(container.querySelector('[data-testid="inline-combinator"]')).toHaveClass(
        'custom-between'
      );
      expect(container.querySelector('[data-testid="inline-combinator"]')).not.toHaveClass(
        'betweenRules'
      );
    });
  });

  describe('"parameter" value source', () => {
    it('routes getParameters into the value editor without any extra wiring', () => {
      const { getAllByTestId } = renderQB({
        fields: [{ name: 'firstName', label: 'First Name', valueSources: ['value', 'parameter'] }],
        defaultQuery: {
          combinator: 'and',
          rules: [
            { id: 'r0', field: 'firstName', operator: '=', value: 'p1', valueSource: 'parameter' },
          ],
        },
        getParameters: () => [
          { name: 'p1', label: 'Param 1' },
          { name: 'p2', label: 'Param 2' },
        ],
      });
      const editor = getAllByTestId('value-editor')[0] as HTMLSelectElement;
      expect(editor.tagName).toBe('SELECT');
      expect([...editor.options].map(o => o.value)).toEqual(['p1', 'p2']);
    });

    it('shows the value-source selector when more than one source is available', () => {
      const { getByTestId } = renderQB({
        fields: [{ name: 'firstName', label: 'First Name', valueSources: ['value', 'field'] }],
        defaultQuery: {
          combinator: 'and',
          rules: [{ id: 'r0', field: 'firstName', operator: '=', value: '' }],
        },
      });
      expect(getByTestId('value-source-selector')).toBeInTheDocument();
    });
  });
});
