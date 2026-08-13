import type { Field, RuleGroupTypeAny, ValueSources } from '@react-querybuilder/core';
import { controlKeys, controlPropKeys } from '@react-querybuilder/core';
import { render } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import type { ComponentOptions } from 'vue';
import { defineComponent, h } from 'vue';
import { defaultControlElements } from './defaultControlElements.js';
import QueryBuilder from './QueryBuilder.vue';

/**
 * The gate for attribute fallthrough (no control sets `inheritAttrs: false`).
 *
 * Two halves, both keyed off core's `controlPropKeys` — the same data `react-querybuilder` gates
 * its own props interfaces against, so neither half can drift from React unnoticed:
 *
 * 1. every default control **declares** every prop its control keys receive, and
 * 2. the port **passes** nothing beyond those keys.
 *
 * Together they mean the `attrs` bag is empty except for what a consumer supplied, so
 * fallthrough is safe. Break either one and a stray attribute lands on the rendered DOM, which
 * React never emits.
 *
 * Excluded, and why: `dragHandle` (drag-and-drop is a documented non-goal),
 * `ruleGroupHeaderElements`/`ruleGroupBodyElements` (internal here, not control elements), and
 * `rule`/`ruleGroup` (their props carry the drag-and-drop set, and neither disables fallthrough).
 */
const gatedKeys = controlKeys.filter(
  k =>
    ![
      'dragHandle',
      'rule',
      'ruleGroup',
      'ruleGroupBodyElements',
      'ruleGroupHeaderElements',
    ].includes(k)
);

const propKeysOf = (key: string): readonly string[] =>
  (controlPropKeys as Record<string, readonly string[]>)[key];

describe('control props', () => {
  it.each(gatedKeys)('`%s`: the default control declares every prop it receives', key => {
    const control = (defaultControlElements as unknown as Record<string, ComponentOptions>)[key];
    const declared = Object.keys(control.props ?? {});
    expect(propKeysOf(key).filter(k => !declared.includes(k))).toEqual([]);
  });

  it('passes no prop outside `controlPropKeys` to any control', () => {
    const received: Record<string, Set<string>> = {};
    const controlElements: Record<string, unknown> = {};
    for (const key of gatedKeys) {
      received[key] = new Set();
      controlElements[key] = defineComponent({
        name: `Probe_${key}`,
        // The probe declares nothing, so every prop it is handed shows up in `attrs`.
        inheritAttrs: false,
        setup: (_props, { attrs }) => {
          for (const k of Object.keys(attrs)) received[key].add(k);
          return () => h('span');
        },
      });
    }

    const fields: Field[] = [
      { name: 'f1', label: 'F1' },
      { name: 'f2', label: 'F2', valueSources: ['value', 'field'] as ValueSources },
      { name: 'sub', label: 'Sub', matchModes: true, subproperties: [{ name: 's1', label: 'S1' }] },
    ];
    const rules = [
      { field: 'f1', operator: '=', value: 'v' },
      { field: 'f2', operator: '=', value: 'v', valueSource: 'value' },
      { field: 'sub', operator: '=', value: { combinator: 'and', rules: [] } },
      { combinator: 'or', rules: [{ field: 'f1', operator: '=', value: 'x' }] },
    ];
    const flags = {
      showCloneButtons: true,
      showLockButtons: true,
      showMuteButtons: true,
      showShiftActions: true,
      showNotToggle: true,
      showUndoRedo: true,
    };

    // Every rendering path, since a control only reports what it is actually handed: the
    // standard shape, combinators between rules, and independent combinators.
    const queries: RuleGroupTypeAny[] = [
      { combinator: 'and', rules } as RuleGroupTypeAny,
      { rules: [rules[0], 'or', rules[1]] } as unknown as RuleGroupTypeAny,
    ];
    for (const defaultQuery of queries) {
      for (const showCombinatorsBetweenRules of [false, true]) {
        render(QueryBuilder, {
          props: { fields, defaultQuery, showCombinatorsBetweenRules, ...flags, controlElements },
        });
      }
    }

    const strays = Object.fromEntries(
      Object.entries(received)
        .map(([key, got]) => [key, [...got].filter(k => !propKeysOf(key).includes(k)).toSorted()])
        .filter(([, extra]) => (extra as string[]).length > 0)
    );
    expect(strays).toEqual({});
    // Guard against the assertion above passing because nothing rendered.
    expect(Object.values(received).filter(s => s.size > 0)).not.toHaveLength(0);
  });
});
