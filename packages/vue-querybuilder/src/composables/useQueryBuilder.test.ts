import type { RuleGroupType, RuleGroupTypeIC } from '@react-querybuilder/core';
import { QueryManager, defaultCombinators } from '@react-querybuilder/core';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, isReactive, nextTick, reactive, ref, shallowRef } from 'vue';
import { baseProps, flatQuery, runInScope, testFields } from '../../test/support.js';
import { provideQueryBuilderContext } from './context.js';
import { useQueryBuilder } from './useQueryBuilder.js';

describe('useQueryBuilder', () => {
  describe('manager resolution', () => {
    it('creates a manager when none is supplied', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps()));
      expect(result.manager).toBeInstanceOf(QueryManager);
    });

    it('adopts an externally supplied manager without reseeding it', () => {
      const manager = new QueryManager(flatQuery, { fields: testFields });
      const { result } = runInScope(() =>
        useQueryBuilder(baseProps({ manager: manager as never, defaultQuery: undefined }))
      );
      expect(result.manager).toBe(manager);
      expect(result.query.value).toBe(manager.getQuery());
    });

    // Gate for the proxy-safe `QueryManager` (core 8.23.0). Vue Test Utils wraps mount props in
    // `reactive`, so a consumer hits this by accident rather than by choice. Before the bump the
    // port had to `toRaw` the manager; without that, every call threw
    // `Cannot read private member #past`.
    it('drives a manager wrapped in `reactive()`', () => {
      const manager = reactive(
        new QueryManager(flatQuery, { fields: testFields, history: true })
      ) as unknown as QueryManager;
      const { result } = runInScope(() =>
        useQueryBuilder(baseProps({ manager: manager as never, defaultQuery: undefined }))
      );
      result.actions.onRuleRemove([0]);
      expect(result.manager.getQuery().rules).toHaveLength(1);
      expect(result.manager.canUndo()).toBe(true);
      result.manager.undo();
      expect(result.manager.getQuery().rules).toHaveLength(2);
      // The state bag is a non-enumerable own property, so it stays out of `Object.keys`,
      // spread, and `JSON.stringify`.
      expect(Object.keys(manager)).toEqual(Object.keys(new QueryManager()));
    });

    it('seeds from defaultQuery', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps({ defaultQuery: flatQuery })));
      expect(result.query.value.rules).toHaveLength(2);
    });

    it('seeds from query', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps({ query: flatQuery })));
      expect(result.query.value.rules).toHaveLength(2);
    });

    it('clears history after seeding, so undo is unavailable on first paint', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps({ defaultQuery: flatQuery })));
      expect(result.manager.canUndo()).toBe(false);
    });

    it('leaves history usable after a real mutation', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps({ defaultQuery: flatQuery })));
      result.actions.onRuleRemove([0]);
      expect(result.manager.canUndo()).toBe(true);
    });
  });

  describe('option lists', () => {
    it('reads fields and combinators off the manager', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps()));
      expect(result.schema.value.fields.map(f => (f as { name: string }).name)).toEqual([
        'firstName',
        'lastName',
        'age',
      ]);
      expect(result.schema.value.combinators.map(c => (c as { name: string }).name)).toEqual(
        defaultCombinators.map(c => c.name)
      );
    });

    it('includes the placeholder option the manager built from merged translations', () => {
      const { result } = runInScope(() =>
        useQueryBuilder(
          baseProps({
            autoSelectField: false,
            translations: { fields: { placeholderLabel: 'Pick one' } },
          })
        )
      );
      expect(result.schema.value.fields[0]).toMatchObject({ label: 'Pick one', value: '~' });
    });

    it('builds a fieldMap keyed by field value', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps()));
      expect(result.schema.value.fieldMap.firstName).toMatchObject({ label: 'First Name' });
    });
  });

  describe('query state', () => {
    it('holds the query in a shallowRef, not a deep proxy', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps({ defaultQuery: flatQuery })));
      expect(isReactive(result.query.value)).toBe(false);
      expect(isReactive(result.query.value.rules[0])).toBe(false);
    });

    it('exposes rootGroup as the same ref as query', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps()));
      expect(result.rootGroup).toBe(result.query);
    });

    it('commits on every manager notification', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps({ defaultQuery: flatQuery })));
      const before = result.query.value;
      result.manager.add({ field: 'age', operator: '=', value: 1 }, []);
      expect(result.query.value).not.toBe(before);
      expect(result.query.value.rules).toHaveLength(3);
    });

    it('notifies exactly once per commit, including inside batch()', () => {
      const onQueryChange = vi.fn();
      const { result } = runInScope(() =>
        useQueryBuilder(baseProps({ defaultQuery: flatQuery, onQueryChange }))
      );
      onQueryChange.mockClear();

      result.manager.batch(() => {
        result.manager.add({ field: 'age', operator: '=', value: 1 }, []);
        result.manager.add({ field: 'age', operator: '=', value: 2 }, []);
      });

      expect(onQueryChange).toHaveBeenCalledTimes(1);
    });

    it('calls onQueryChange and writeBack for each commit', () => {
      const onQueryChange = vi.fn();
      const writeBack = vi.fn();
      const { result } = runInScope(() =>
        useQueryBuilder(baseProps({ defaultQuery: flatQuery, onQueryChange }), { writeBack })
      );
      onQueryChange.mockClear();
      writeBack.mockClear();

      result.actions.onRuleRemove([0]);

      expect(onQueryChange).toHaveBeenCalledTimes(1);
      expect(writeBack).toHaveBeenCalledTimes(1);
      expect(writeBack.mock.calls[0][0]).toBe(result.query.value);
    });

    it('notifies on mount, since enableMountQueryChange defaults to true', () => {
      const onQueryChange = vi.fn();
      runInScope(() => useQueryBuilder(baseProps({ defaultQuery: flatQuery, onQueryChange })));
      expect(onQueryChange).toHaveBeenCalledTimes(1);
    });

    it('does not notify on mount when enableMountQueryChange is false', () => {
      const onQueryChange = vi.fn();
      const writeBack = vi.fn();
      runInScope(() =>
        useQueryBuilder(
          baseProps({ defaultQuery: flatQuery, onQueryChange, enableMountQueryChange: false }),
          { writeBack }
        )
      );
      expect(onQueryChange).not.toHaveBeenCalled();
      expect(writeBack).not.toHaveBeenCalled();
    });

    it('honors enableMountQueryChange', () => {
      const onQueryChange = vi.fn();
      const writeBack = vi.fn();
      runInScope(() =>
        useQueryBuilder(
          baseProps({ defaultQuery: flatQuery, onQueryChange, enableMountQueryChange: true }),
          { writeBack }
        )
      );
      expect(onQueryChange).toHaveBeenCalledTimes(1);
      expect(writeBack).toHaveBeenCalledTimes(1);
    });

    it('defers the mount notification to onMounted inside a component', async () => {
      const onQueryChange = vi.fn();
      const order: string[] = [];
      mount(
        defineComponent({
          setup() {
            useQueryBuilder(
              baseProps({
                defaultQuery: flatQuery,
                enableMountQueryChange: true,
                onQueryChange: (...args: unknown[]) => {
                  order.push('onQueryChange');
                  onQueryChange(...args);
                },
              })
            );
            order.push('setup');
            return () => h('div');
          },
        })
      );
      await nextTick();
      expect(order).toEqual(['setup', 'onQueryChange']);
    });

    it('unsubscribes from the manager when the scope is disposed', () => {
      const onQueryChange = vi.fn();
      const manager = new QueryManager(flatQuery, { fields: testFields });
      const { result, scope } = runInScope(() =>
        useQueryBuilder(baseProps({ manager: manager as never, onQueryChange }))
      );
      const lastQuery = result.query.value;
      onQueryChange.mockClear();

      scope.stop();
      manager.add({ field: 'age', operator: '=', value: 1 }, []);

      expect(onQueryChange).not.toHaveBeenCalled();
      expect(result.query.value).toBe(lastQuery);
    });
  });

  describe('controlled mode', () => {
    it('pushes a new query prop into the manager', async () => {
      const props = shallowRef(baseProps({ query: flatQuery }));
      const { result } = runInScope(() => useQueryBuilder(() => props.value));

      props.value = baseProps({ query: { combinator: 'or', rules: [] } as RuleGroupType });
      await nextTick();

      expect(result.manager.getQuery().combinator).toBe('or');
      expect(result.query.value.rules).toHaveLength(0);
    });

    it('does not loop when the parent echoes back the query it was handed', async () => {
      const onQueryChange = vi.fn();
      // A parent holding the query in `reactive` — the case reference equality alone misses,
      // because the getter hands back a Proxy of the very object just emitted.
      const parent = reactive({ query: flatQuery as RuleGroupType });
      const { result } = runInScope(() =>
        useQueryBuilder(() =>
          baseProps({
            query: parent.query,
            onQueryChange: (q: RuleGroupType) => {
              onQueryChange(q);
              parent.query = q as RuleGroupType;
            },
          })
        )
      );

      onQueryChange.mockClear();
      result.actions.onRuleRemove([0]);
      await nextTick();
      await nextTick();

      // Exactly one: the echo back into the `query` prop must not re-enter the manager.
      expect(onQueryChange).toHaveBeenCalledTimes(1);
      expect(result.query.value.rules).toHaveLength(1);
    });

    it('accepts a query held in a deep reactive parent without tripping the deep freeze', () => {
      const parent = reactive({ query: structuredClone(flatQuery) });
      expect(isReactive(parent.query)).toBe(true);
      const { result } = runInScope(() =>
        useQueryBuilder(() => baseProps({ query: parent.query }))
      );
      // Seeding a reactive proxy would throw from Immer's deep freeze without `toRaw`.
      expect(result.query.value.rules).toHaveLength(2);
      expect(isReactive(result.query.value)).toBe(false);
    });

    it('ignores a shallow-copied replacement query', async () => {
      const props = shallowRef(baseProps({ query: flatQuery }));
      const { result } = runInScope(() => useQueryBuilder(() => props.value));
      const before = result.query.value;

      // A shallow copy: a different root reference, but every rule is the same object. This is
      // what a parent that spreads the query on each change hands back, and it is precisely the
      // case the `Object.is` fast path misses and the signature guard catches.
      props.value = baseProps({ query: { ...before, rules: [...before.rules] } as RuleGroupType });
      await nextTick();

      expect(result.query.value).toBe(before);
    });

    it('accepts a deep-cloned replacement query, which is a genuine structural change', async () => {
      const props = shallowRef(baseProps({ query: flatQuery }));
      const { result } = runInScope(() => useQueryBuilder(() => props.value));
      const before = result.query.value;

      props.value = baseProps({ query: structuredClone(before) as RuleGroupType });
      await nextTick();

      expect(result.query.value).not.toBe(before);
      expect(result.query.value).toEqual(before);
    });

    it('ignores an absent query prop', async () => {
      const props = shallowRef(baseProps({ query: flatQuery }));
      const { result } = runInScope(() => useQueryBuilder(() => props.value));
      const before = result.query.value;

      props.value = baseProps({ query: undefined });
      await nextTick();

      expect(result.query.value).toBe(before);
    });
  });

  describe('derived config', () => {
    it('detects independent combinators', () => {
      const ic: RuleGroupTypeIC = { rules: [] };
      const { result } = runInScope(() => useQueryBuilder(baseProps({ defaultQuery: ic })));
      expect(result.independentCombinators.value).toBe(true);
      expect(result.inlineCombinatorsAttr.value).toBe('enabled');
    });

    it('enables inline combinators for showCombinatorsBetweenRules', () => {
      const { result } = runInScope(() =>
        useQueryBuilder(baseProps({ showCombinatorsBetweenRules: true }))
      );
      expect(result.inlineCombinatorsAttr.value).toBe('enabled');
    });

    it('disables inline combinators otherwise', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps()));
      expect(result.inlineCombinatorsAttr.value).toBe('disabled');
    });

    it('always reports drag-and-drop as disabled', () => {
      const { result } = runInScope(() =>
        useQueryBuilder(baseProps({ enableDragAndDrop: true } as never))
      );
      expect(result.dndEnabledAttr).toBe('disabled');
      expect(result.schema.value.enableDragAndDrop).toBe(false);
    });

    it('distinguishes a disabled query from a disabled root group', () => {
      const disabledRoot = runInScope(() =>
        useQueryBuilder(baseProps({ defaultQuery: { ...flatQuery, disabled: true } }))
      ).result;
      expect(disabledRoot.rootGroupDisabled.value).toBe(true);
      expect(disabledRoot.queryDisabled.value).toBe(false);
      // A disabled root *group* must not add the disabled class to the wrapper.
      expect(disabledRoot.wrapperClassName.value).not.toContain('queryBuilder-disabled');

      const disabledAll = runInScope(() => useQueryBuilder(baseProps({ disabled: true }))).result;
      expect(disabledAll.queryDisabled.value).toBe(true);
      expect(disabledAll.wrapperClassName.value).toContain('queryBuilder-disabled');
    });

    it('treats a disabled path of [] as a disabled root group', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps({ disabled: [[]] })));
      expect(result.rootGroupDisabled.value).toBe(true);
      expect(result.queryDisabled.value).toBe(false);
      expect(result.schema.value.disabledPaths).toEqual([[]]);
    });

    it('applies the validation result to the wrapper class name', () => {
      const { result } = runInScope(() =>
        useQueryBuilder(baseProps({ validator: () => false, defaultQuery: flatQuery }))
      );
      expect(result.wrapperClassName.value).toContain('queryBuilder-invalid');
      expect(result.schema.value.validationMap).toEqual({});
    });

    it('exposes a validation map from an object-returning validator', () => {
      const { result } = runInScope(() =>
        useQueryBuilder(
          baseProps({
            defaultQuery: flatQuery,
            validator: () => ({ r0: { valid: false, reasons: ['nope'] } }),
          })
        )
      );
      expect(result.schema.value.validationMap.r0).toEqual({ valid: false, reasons: ['nope'] });
    });
  });

  describe('config resolution', () => {
    it('inherits flags from provided context', () => {
      // oxlint-disable-next-line typescript/no-explicit-any
      let state: any;
      const Child = defineComponent({
        setup() {
          state = useQueryBuilder(baseProps());
          return () => h('div');
        },
      });
      mount(
        defineComponent({
          setup() {
            provideQueryBuilderContext({ showNotToggle: true });
            return () => h(Child);
          },
        })
      );
      expect(state.schema.value.showNotToggle).toBe(true);
    });

    it('lets props override inherited context', () => {
      const { result } = runInScope(() =>
        useQueryBuilder(baseProps({ showNotToggle: false }), { context: { showNotToggle: true } })
      );
      expect(result.schema.value.showNotToggle).toBe(false);
    });

    it('re-derives the schema when a prop changes', async () => {
      const show = ref(false);
      const { result } = runInScope(() =>
        useQueryBuilder(() => baseProps({ showNotToggle: show.value }))
      );
      expect(result.schema.value.showNotToggle).toBe(false);
      show.value = true;
      await nextTick();
      expect(result.schema.value.showNotToggle).toBe(true);
    });

    it('publishes the same resolved config through context', () => {
      const { result } = runInScope(() =>
        useQueryBuilder(
          baseProps({ showCloneButtons: true, translations: { addRule: { label: '+' } } })
        )
      );
      expect(result.context.value.showCloneButtons).toBe(true);
      expect(result.context.value.translations?.addRule?.label).toBe('+');
      expect(result.context.value.controlElements).toBe(result.controls.value);
      expect(result.context.value.controlClassnames).toBe(result.classNames.value);
    });
  });

  describe('schema resolvers', () => {
    it('forwards a function prop live, without rebuilding the manager', async () => {
      const separator = ref('and');
      const { result } = runInScope(() =>
        useQueryBuilder(baseProps({ getValueEditorSeparator: () => separator.value }))
      );
      expect(result.schema.value.getValueEditorSeparator('age', 'between', {} as never)).toBe(
        'and'
      );
      separator.value = 'to';
      await nextTick();
      expect(result.schema.value.getValueEditorSeparator('age', 'between', {} as never)).toBe('to');
    });

    it('defaults getValueEditorSeparator and the classname getters to empty strings', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps()));
      const { schema } = result;
      expect(schema.value.getValueEditorSeparator('age', '=', {} as never)).toBe('');
      expect(schema.value.getRuleClassname({} as never, {} as never)).toBe('');
      expect(schema.value.getRuleGroupClassname({} as never)).toBe('');
    });

    it('prepares parameters with an auto-selected first option', () => {
      const { result } = runInScope(() =>
        useQueryBuilder(baseProps({ getParameters: () => [{ name: 'p1', label: 'P1' }] }))
      );
      expect(result.schema.value.getParameters('firstName', '=')).toHaveLength(1);
    });

    it('returns an empty parameter list when getParameters is absent', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps()));
      expect(result.schema.value.getParameters('firstName', '=')).toEqual([]);
    });

    it('defaults getInputType to text', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps()));
      expect(result.schema.value.getInputType('firstName', '=', {} as never)).toBe('text');
    });

    it('defaults getSubQueryBuilderProps to an empty object', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps()));
      expect(
        result.schema.value.getSubQueryBuilderProps('firstName' as never, {} as never)
      ).toEqual({});
    });

    it('exposes the manager-backed option resolvers', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps()));
      const { schema } = result;
      expect(schema.value.getOperators('firstName', {} as never).length).toBeGreaterThan(0);
      expect(schema.value.getValueEditorType('firstName', '=', {} as never)).toBe('text');
      expect(schema.value.getValues('firstName', '=', {} as never)).toEqual([
        expect.objectContaining({ value: '~' }),
      ]);
      expect(schema.value.getValueSources('firstName', '=', {} as never)).toEqual([
        expect.objectContaining({ value: 'value' }),
      ]);
      expect(schema.value.getMatchModes('firstName', {} as never)).toEqual([]);
      expect(schema.value.getRuleDefaultOperator('firstName')).toBe('=');
      expect(
        schema.value.getRuleDefaultValue({ field: 'firstName', operator: '=', value: '' })
      ).toBe('');
    });

    it('creates rules and groups through the manager', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps()));
      expect(result.schema.value.createRule()).toMatchObject({ field: 'firstName' });
      expect(result.schema.value.createRuleGroup()).toMatchObject({ combinator: 'and' });
      expect(result.schema.value.createRuleGroup(true)).not.toHaveProperty('combinator');
      expect(result.schema.value.getQuery()).toBe(result.manager.getQuery());
    });

    it('creates independent-combinator groups by default for an IC query', () => {
      const { result } = runInScope(() =>
        useQueryBuilder(baseProps({ defaultQuery: { rules: [] } as RuleGroupTypeIC }))
      );
      expect(result.schema.value.createRuleGroup()).not.toHaveProperty('combinator');
    });

    it('defaults the accessible description generator', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps()));
      expect(result.schema.value.accessibleDescriptionGenerator({ path: [], qbId: '' })).toEqual(
        expect.any(String)
      );
    });
  });

  describe('maxLevels', () => {
    it('is Infinity when unset or non-positive', () => {
      expect(runInScope(() => useQueryBuilder(baseProps())).result.schema.value.maxLevels).toBe(
        Infinity
      );
      expect(
        runInScope(() => useQueryBuilder(baseProps({ maxLevels: 0 }))).result.schema.value.maxLevels
      ).toBe(Infinity);
    });

    it('is honored when positive', () => {
      const { result } = runInScope(() => useQueryBuilder(baseProps({ maxLevels: 2 })));
      expect(result.schema.value.maxLevels).toBe(2);
    });
  });
});
