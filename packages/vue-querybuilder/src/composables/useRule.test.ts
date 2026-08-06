import type { RuleType } from '@react-querybuilder/core';
import { describe, expect, it } from 'vitest';
import { computed, nextTick, ref } from 'vue';
import {
  baseProps,
  createRecordingActions,
  flatQuery,
  ruleProps,
  runInScope,
} from '../../test/support.js';
import { useQueryBuilder } from './useQueryBuilder.js';
import { useRule } from './useRule.js';

const clickEvent = (altKey: boolean) =>
  ({ altKey, preventDefault: () => {}, stopPropagation: () => {} }) as unknown as MouseEvent;

const rule: RuleType = { id: 'r0', field: 'firstName', operator: '=', value: 'Steve' };

const setup = (
  overrides: Parameters<typeof ruleProps>[2] = {},
  qbOverrides: Parameters<typeof baseProps>[0] = {}
) => {
  const { calls, actions } = createRecordingActions();
  const { result: state } = runInScope(() =>
    useQueryBuilder(baseProps({ defaultQuery: flatQuery, ...qbOverrides }))
  );
  const props = ruleProps(state, rule, { actions, ...overrides });
  const { result } = runInScope(() => useRule(props));
  return { result, calls, state, props };
};

describe('useRule', () => {
  describe('derived state', () => {
    it('resolves the rule context from the schema', () => {
      const { result } = setup();
      expect(result.ctx.value.fieldData.name).toBe('firstName');
      expect(result.ctx.value.operators.length).toBeGreaterThan(0);
      expect(result.fieldData.value.label).toBe('First Name');
    });

    it('resolves a rule that is not in the manager query at all', () => {
      // A subquery rule has no resolvable path, so the derivation must not depend on one.
      const { result } = setup({ path: [9, 9], rule: { field: 'age', operator: '>', value: 1 } });
      expect(result.ctx.value.fieldData.name).toBe('age');
    });

    it('produces standard class names', () => {
      const { result } = setup();
      expect(result.classNames.value.fields).toContain('rule-fields');
      expect(result.outerClassName.value).toContain('rule');
    });

    it('suppresses standard class names when asked', () => {
      const { result } = setup({}, { suppressStandardClassnames: true });
      expect(result.classNames.value.fields).not.toContain('rule-fields');
    });

    it('combines parent and own disabled state', () => {
      expect(setup({ disabled: true }).result.disabled.value).toBe(true);
      expect(setup({ parentDisabled: true }).result.disabled.value).toBe(true);
      expect(setup().result.disabled.value).toBe(false);
    });

    it('combines parent and own muted state', () => {
      expect(setup({ parentMuted: true }).result.muted.value).toBe(true);
      expect(setup({ rule: { ...rule, muted: true } }).result.muted.value).toBe(true);
      expect(setup().result.muted.value).toBe(false);
    });

    it('adds the disabled and muted class names to the outer class', () => {
      expect(setup({ disabled: true }).result.outerClassName.value).toContain(
        'queryBuilder-disabled'
      );
      expect(setup({ parentMuted: true }).result.outerClassName.value).toContain(
        'queryBuilder-muted'
      );
    });

    it('includes the field and operator class names in the outer class', () => {
      const { result } = setup(
        {},
        {
          fields: [{ name: 'firstName', label: 'First Name', className: 'field-cls' }],
          getRuleClassname: () => 'rule-cls',
        }
      );
      expect(result.outerClassName.value).toContain('field-cls');
      expect(result.outerClassName.value).toContain('rule-cls');
    });

    it('reports the validation result through the outer class', () => {
      const { result } = setup(
        {},
        { validator: () => ({ r0: { valid: false, reasons: ['no'] } }) }
      );
      expect(result.outerClassName.value).toContain('queryBuilder-invalid');
    });

    it('defaults the value editor separator to an empty string', () => {
      expect(setup().result.valueEditorSeparator.value).toBe('');
    });

    it('reads the value editor separator from the schema', () => {
      const { result } = setup({}, { getValueEditorSeparator: () => 'and' });
      expect(result.valueEditorSeparator.value).toBe('and');
    });
  });

  describe('display flags', () => {
    it('reports no subquery for a plain field', () => {
      expect(setup().result.hasSubQuery.value).toBe(false);
    });

    it('reports a subquery when the field has match modes', () => {
      const { result } = setup(
        { rule: { field: 'items', operator: '=', value: '' } },
        { fields: [{ name: 'items', label: 'Items' }], getMatchModes: () => ['all', 'some'] }
      );
      expect(result.hasSubQuery.value).toBe(true);
      expect(result.outerClassName.value).toContain('rule-hasSubQuery');
    });

    it('shows the field selector for a normal field list', () => {
      expect(setup().result.showFieldSelector.value).toBe(true);
    });

    it('hides the field selector when the only field has an empty value', () => {
      const { result } = setup(
        { rule: { field: '', operator: '=', value: '' } },
        { fields: [{ name: '', value: '', label: '------' }] }
      );
      expect(result.showFieldSelector.value).toBe(false);
    });

    it('shows the value controls for a resolved operator', () => {
      expect(setup().result.showValueControls.value).toBe(true);
    });

    it('hides the value controls for a unary operator', () => {
      // Driven by the operator's `arity`, which the default operator list does not declare.
      const { result } = setup(
        { rule: { ...rule, operator: 'null' } },
        { operators: [{ name: 'null', label: 'is null', arity: 'unary' }] }
      );
      expect(result.showValueControls.value).toBe(false);
    });

    it('hides the value source selector unless there is more than one source', () => {
      expect(setup().result.showValueSourceSelector.value).toBe(false);
    });

    it('shows the value source selector when several sources are available', () => {
      const { result } = setup({}, { getValueSources: () => ['value', 'field'] });
      expect(result.showValueSourceSelector.value).toBe(true);
    });

    it('hides the value source selector for a null operator even with several sources', () => {
      const { result } = setup(
        { rule: { ...rule, operator: 'null' } },
        { getValueSources: () => ['value', 'field'] }
      );
      expect(result.showValueSourceSelector.value).toBe(false);
    });
  });

  describe('change handlers', () => {
    it('dispatches each property change', () => {
      const { result, calls } = setup();
      result.onChangeField('lastName');
      result.onChangeOperator('>');
      result.onChangeMatchMode('all');
      result.onChangeValueSource('field');
      result.onChangeValue('x');

      expect(calls.map(c => c.args[0])).toEqual([
        'field',
        'operator',
        'match',
        'valueSource',
        'value',
      ]);
      expect(calls[0].args.slice(0, 3)).toEqual(['field', 'lastName', [0]]);
    });

    it('forwards the context argument', () => {
      const { result, calls } = setup();
      result.onChangeValue('x', 'ctx');
      expect(calls[0].args[3]).toBe('ctx');
    });

    it('is inert when disabled', () => {
      const { result, calls } = setup({ disabled: true });
      result.onChangeField('lastName');
      expect(calls).toHaveLength(0);
    });
  });

  describe('action handlers', () => {
    it('stops propagation of the triggering event', () => {
      const { result } = setup();
      let prevented = false;
      let stopped = false;
      const event = {
        preventDefault: () => {
          prevented = true;
        },
        stopPropagation: () => {
          stopped = true;
        },
      } as unknown as MouseEvent;

      result.removeRule(event);
      expect(prevented).toBe(true);
      expect(stopped).toBe(true);
    });

    it('tolerates being called with no event', () => {
      const { result, calls } = setup();
      result.removeRule();
      expect(calls[0].name).toBe('onRuleRemove');
    });

    it('clones a rule to the next sibling position', () => {
      const { result, calls } = setup({ path: [1] });
      result.cloneRule();
      expect(calls[0]).toMatchObject({ name: 'moveRule', args: [[1], [2], true, undefined] });
    });

    it('toggles lock and mute', () => {
      const { result, calls } = setup();
      result.toggleLockRule();
      result.toggleMuteRule();
      expect(calls[0].args.slice(0, 3)).toEqual(['disabled', true, [0]]);
      expect(calls[1].args.slice(0, 3)).toEqual(['muted', true, [0]]);
    });

    it('unlocks a disabled rule — the only handler that works while disabled', () => {
      const { result, calls } = setup({ disabled: true });
      result.toggleLockRule();
      expect(calls[0].args.slice(0, 3)).toEqual(['disabled', false, [0]]);
    });

    it('removes a rule', () => {
      const { result, calls } = setup();
      result.removeRule();
      expect(calls[0]).toMatchObject({ name: 'onRuleRemove', args: [[0]] });
    });

    it('shifts up and down, forwarding altKey as the clone flag', () => {
      const { result, calls } = setup({ path: [1] });
      result.shiftRuleUp(clickEvent(true));
      result.shiftRuleDown(clickEvent(false));
      expect(calls[0].args.slice(0, 3)).toEqual([[1], 'up', true]);
      expect(calls[1].args.slice(0, 3)).toEqual([[1], 'down', false]);
    });

    it('respects shiftUpDisabled and shiftDownDisabled', () => {
      const up = setup({ shiftUpDisabled: true });
      up.result.shiftRuleUp();
      expect(up.calls).toHaveLength(0);

      const down = setup({ shiftDownDisabled: true });
      down.result.shiftRuleDown();
      expect(down.calls).toHaveLength(0);
    });

    it('is inert when disabled', () => {
      const { result, calls } = setup({ disabled: true });
      result.cloneRule();
      result.removeRule();
      result.shiftRuleUp();
      result.shiftRuleDown();
      expect(calls).toHaveLength(0);
    });
  });

  describe('reactivity', () => {
    it('accepts a getter and tracks it', async () => {
      const { calls, actions } = createRecordingActions();
      const { result: state } = runInScope(() =>
        useQueryBuilder(baseProps({ defaultQuery: flatQuery }))
      );
      const field = ref('firstName');
      const { result } = runInScope(() =>
        useRule(() => ruleProps(state, { ...rule, field: field.value }, { actions }))
      );

      expect(result.fieldData.value.name).toBe('firstName');
      field.value = 'age';
      await nextTick();
      expect(result.fieldData.value.name).toBe('age');
      expect(calls).toHaveLength(0);
    });

    it('accepts a ref-like computed props object', () => {
      const { actions } = createRecordingActions();
      const { result: state } = runInScope(() =>
        useQueryBuilder(baseProps({ defaultQuery: flatQuery }))
      );
      const props = computed(() => ruleProps(state, rule, { actions }));
      const { result } = runInScope(() => useRule(props));
      expect(result.fieldData.value.name).toBe('firstName');
    });
  });
});
