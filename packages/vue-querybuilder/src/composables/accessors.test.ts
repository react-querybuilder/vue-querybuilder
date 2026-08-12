import type { RuleGroupType } from '@react-querybuilder/core';
import { render } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import QueryBuilder from '../components/QueryBuilder.vue';
import {
  useCurrentPath,
  useCurrentRule,
  useCurrentRuleGroup,
  useQueryBuilderActions,
  useSchema,
} from './accessors.js';

/** What every probe below records, so one assertion shape covers all of them. */
interface Seen {
  schema: ReturnType<typeof useSchema>;
  actions: ReturnType<typeof useQueryBuilderActions>;
  rule: ReturnType<typeof useCurrentRule>;
  ruleGroup: ReturnType<typeof useCurrentRuleGroup>;
  path: ReturnType<typeof useCurrentPath>;
}

const seen: Seen[] = [];

/** The field names visible to a probe, through its injected schema. */
const fieldNames = (s: Seen): string[] =>
  (s.schema?.value.fields ?? []).map(f => ('name' in f ? f.name : f.label));

/**
 * A control that declares no props at all and reads everything through injection — the shape the
 * accessors exist to make possible.
 */
// Cast at every use site: `Controls[...]` is `Component<P>` with `P` required, so a component
// that declares no props at all is not assignable even though it renders fine. The prop bag is
// still the typed contract; injection is the runtime convenience.
const Probe = defineComponent({
  name: 'Probe',
  inheritAttrs: false,
  setup() {
    const record: Seen = {
      schema: useSchema(),
      actions: useQueryBuilderActions(),
      rule: useCurrentRule(),
      ruleGroup: useCurrentRuleGroup(),
      path: useCurrentPath(),
    };
    seen.push(record);
    return () => h('span', { 'data-testid': 'probe' });
  },
});

const query: RuleGroupType = {
  id: 'root',
  combinator: 'and',
  rules: [
    { id: 'r0', field: 'firstName', operator: '=', value: 'Steve' },
    {
      id: 'g0',
      combinator: 'or',
      rules: [{ id: 'r1', field: 'lastName', operator: '=', value: 'Vai' }],
    },
  ],
};

const fields = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
];

/** Renders a query builder with `Probe` substituted for one control element. */
const renderWithProbe = (controlKey: string) => {
  seen.length = 0;
  return render(QueryBuilder, {
    props: { fields, defaultQuery: query, controlElements: { [controlKey]: Probe as never } },
  });
};

describe('injection accessors inside a query builder', () => {
  it('exposes the schema to a control that declares no props', () => {
    renderWithProbe('valueEditor');
    expect(seen).not.toHaveLength(0);
    expect(fieldNames(seen[0])).toEqual(['firstName', 'lastName']);
  });

  it('exposes the actions', () => {
    renderWithProbe('valueEditor');
    expect(typeof seen[0].actions?.value.onPropChange).toBe('function');
  });

  it('exposes the enclosing rule and its path', () => {
    renderWithProbe('valueEditor');
    expect(seen[0].rule?.value.id).toBe('r0');
    expect(seen[0].path?.value).toEqual([0]);
    // A rule is not a group.
    expect(seen[0].ruleGroup).toBeUndefined();
  });

  it('exposes the enclosing group and its path, and not a rule', () => {
    renderWithProbe('combinatorSelector');
    // The root group's selector renders first.
    expect(seen[0].ruleGroup?.value.id).toBe('root');
    expect(seen[0].path?.value).toEqual([]);
    expect(seen[0].rule).toBeUndefined();
  });

  it('resolves the nearest node, not the outermost', () => {
    renderWithProbe('combinatorSelector');
    const nested = seen.find(s => s.ruleGroup?.value.id === 'g0');
    expect(nested).toBeDefined();
    expect(nested!.path?.value).toEqual([1]);
  });

  it('tracks the current rule reactively', async () => {
    seen.length = 0;
    const { getAllByTestId, rerender } = render(QueryBuilder, {
      props: { fields, query, controlElements: { valueEditor: Probe as never } },
    });
    expect(getAllByTestId('probe')).not.toHaveLength(0);
    const before = seen[0].rule!.value.value;
    await rerender({
      fields,
      query: { ...query, rules: [{ ...query.rules[0], value: 'Joe' }, query.rules[1]] },
      controlElements: { valueEditor: Probe as never },
    });
    expect(before).toBe('Steve');
    expect(seen[0].rule!.value.value).toBe('Joe');
  });
});

describe('injection accessors with no provider', () => {
  it('return undefined inside a component with no query builder above it', () => {
    seen.length = 0;
    render(defineComponent({ render: () => h(Probe) }));
    expect(seen[0]).toEqual({
      schema: undefined,
      actions: undefined,
      rule: undefined,
      ruleGroup: undefined,
      path: undefined,
    });
  });

  it('return undefined outside of a component instance entirely, and warn about nothing', () => {
    // `inject()` outside of `setup` logs a Vue warning. The accessors are documented as safe to
    // call anywhere, so they must not reach `inject` at all when there is no instance.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(useSchema()).toBeUndefined();
      expect(useQueryBuilderActions()).toBeUndefined();
      expect(useCurrentRule()).toBeUndefined();
      expect(useCurrentRuleGroup()).toBeUndefined();
      expect(useCurrentPath()).toBeUndefined();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

describe('injection accessors inside a subquery', () => {
  const subField = {
    name: 'sub',
    label: 'Sub',
    matchModes: true,
    subproperties: [{ name: 's1', label: 'S1' }],
  };

  it('resolve the subquery schema rather than the enclosing one', () => {
    seen.length = 0;
    render(QueryBuilder, {
      props: {
        fields: [subField],
        defaultQuery: {
          combinator: 'and',
          rules: [
            {
              id: 'r0',
              field: 'sub',
              operator: '=',
              match: { mode: 'all' },
              value: {
                id: 'sq0',
                combinator: 'and',
                rules: [{ id: 'sr0', field: 's1', operator: '=', value: 'x' }],
              },
            },
          ],
        },
        controlElements: { valueEditor: Probe as never },
      },
    });
    // Only the subquery's rule renders a value editor; its schema is the subquery's.
    expect(seen).not.toHaveLength(0);
    for (const s of seen) expect(fieldNames(s)).toEqual(['s1']);
    expect(seen[0].rule?.value.id).toBe('sr0');
  });
});
