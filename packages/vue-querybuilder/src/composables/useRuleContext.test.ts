import type { RuleGroupType } from '@react-querybuilder/core';
import { QueryManager } from '@react-querybuilder/core';
import { describe, expect, it } from 'vitest';
import { nextTick, ref, shallowRef } from 'vue';
import { flatQuery, runInScope, testFields } from '../../test/support.js';
import { useRuleContext } from './useRuleContext.js';
import { useRuleGroupContext } from './useRuleGroupContext.js';

const nested: RuleGroupType = {
  id: 'root',
  combinator: 'and',
  rules: [
    { id: 'r0', field: 'firstName', operator: '=', value: 'Steve' },
    { id: 'g1', combinator: 'or', rules: [{ id: 'r1', field: 'age', operator: '>', value: 30 }] },
  ],
};

const managerFor = (query: RuleGroupType) =>
  new QueryManager(structuredClone(query), { fields: testFields });

describe('useRuleContext', () => {
  it('resolves the context for a rule', () => {
    const manager = managerFor(flatQuery);
    const query = shallowRef(manager.getQuery());
    const { result } = runInScope(() => useRuleContext(manager as never, [0], query));

    expect(result.value?.fieldData.name).toBe('firstName');
    expect(result.value?.operators.length).toBeGreaterThan(0);
    expect(result.value?.valueEditorType).toBe('text');
  });

  it('resolves a nested rule', () => {
    const manager = managerFor(nested);
    const query = shallowRef(manager.getQuery());
    const { result } = runInScope(() => useRuleContext(manager as never, [1, 0], query));
    expect(result.value?.fieldData.name).toBe('age');
  });

  it('returns null for a path that is not a rule', () => {
    const manager = managerFor(flatQuery);
    const query = shallowRef(manager.getQuery());
    const { result } = runInScope(() => useRuleContext(manager as never, [], query));
    expect(result.value).toBeNull();
  });

  it('returns null for an unresolvable path', () => {
    const manager = managerFor(flatQuery);
    const query = shallowRef(manager.getQuery());
    const { result } = runInScope(() => useRuleContext(manager as never, [99], query));
    expect(result.value).toBeNull();
  });

  it('recomputes when the query identity changes', async () => {
    const manager = managerFor(flatQuery);
    const query = shallowRef(manager.getQuery());
    const { result } = runInScope(() => useRuleContext(manager as never, [0], query));
    expect(result.value?.fieldData.name).toBe('firstName');

    manager.update('field', 'age', [0]);
    query.value = manager.getQuery();
    await nextTick();

    expect(result.value?.fieldData.name).toBe('age');
  });

  it('recomputes when the path changes', async () => {
    const manager = managerFor(flatQuery);
    const query = shallowRef(manager.getQuery());
    const path = ref([0]);
    const { result } = runInScope(() => useRuleContext(manager as never, path, query));
    expect(result.value?.fieldData.name).toBe('firstName');

    path.value = [1];
    await nextTick();

    expect(result.value?.fieldData.name).toBe('lastName');
  });

  it('accepts getters for every argument', () => {
    const manager = managerFor(flatQuery);
    const { result } = runInScope(() =>
      useRuleContext(
        () => manager as never,
        () => [0],
        () => manager.getQuery()
      )
    );
    expect(result.value?.fieldData.name).toBe('firstName');
  });
});

describe('useRuleGroupContext', () => {
  it('resolves the context for the root group', () => {
    const manager = managerFor(flatQuery);
    const query = shallowRef(manager.getQuery());
    const { result } = runInScope(() => useRuleGroupContext(manager as never, [], query));
    expect(result.value?.combinator).toBe('and');
  });

  it('resolves a nested group', () => {
    const manager = managerFor(nested);
    const query = shallowRef(manager.getQuery());
    const { result } = runInScope(() => useRuleGroupContext(manager as never, [1], query));
    expect(result.value?.combinator).toBe('or');
  });

  it('returns null for a path that is not a group', () => {
    const manager = managerFor(flatQuery);
    const query = shallowRef(manager.getQuery());
    const { result } = runInScope(() => useRuleGroupContext(manager as never, [0], query));
    expect(result.value).toBeNull();
  });

  it('recomputes when the query identity changes', async () => {
    const manager = managerFor(flatQuery);
    const query = shallowRef(manager.getQuery());
    const { result } = runInScope(() => useRuleGroupContext(manager as never, [], query));
    expect(result.value?.combinator).toBe('and');

    manager.update('combinator', 'or', []);
    query.value = manager.getQuery();
    await nextTick();

    expect(result.value?.combinator).toBe('or');
  });
});
