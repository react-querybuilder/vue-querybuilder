import type { Field, RuleGroupTypeAny, ValueSources } from '@react-querybuilder/core';
import { controlKeys, controlKind, controlPropKeys } from '@react-querybuilder/core';
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

/**
 * `ValueSelector` is the default for all five selector keys, so the props it may legitimately
 * receive are the union of their sets — `VersatileSelectorProps`, which is what it declares.
 * `valueEditor` forwards `field`/`fieldData`/`rule` into its nested selector exactly as React's
 * `propsForValueSelector` does, so the `valueSelector` slot is gated against that union rather
 * than against its own key alone.
 */
const versatileSelectorKeys = [
  ...new Set(
    [...controlKeys.filter(k => controlKind[k] === 'selector'), 'valueSelector'].flatMap(
      k => (controlPropKeys as Record<string, readonly string[]>)[k] ?? []
    )
  ),
];

const propKeysOf = (key: string): readonly string[] =>
  key === 'valueSelector'
    ? versatileSelectorKeys
    : (controlPropKeys as Record<string, readonly string[]>)[key];

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
      { name: 'sel', label: 'Sel', valueEditorType: 'select', values: [{ name: 'a', label: 'A' }] },
    ];
    const rules = [
      { field: 'f1', operator: '=', value: 'v' },
      { field: 'f2', operator: '=', value: 'v', valueSource: 'value' },
      { field: 'sel', operator: '=', value: 'a' },
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
      showUngroupButtons: true,
    };

    // Every rendering path, since a control only reports what it is actually handed: the
    // standard shape, combinators between rules, and independent combinators.
    const queries: RuleGroupTypeAny[] = [
      { combinator: 'and', rules } as RuleGroupTypeAny,
      { rules: [rules[0], 'or', rules[1]] } as unknown as RuleGroupTypeAny,
    ];
    // `valueSelector` is only ever rendered *by* another control (`valueEditor`,
    // `matchModeEditor`), so a probe in its slot never mounts while those are probes too. This
    // pass restores the real ones so the `valueSelector` probe actually receives props.
    const viaRealEditors = { ...controlElements };
    delete viaRealEditors.valueEditor;
    delete viaRealEditors.matchModeEditor;

    for (const defaultQuery of queries) {
      for (const showCombinatorsBetweenRules of [false, true]) {
        render(QueryBuilder, {
          props: { fields, defaultQuery, showCombinatorsBetweenRules, ...flags, controlElements },
        });
        render(QueryBuilder, {
          props: {
            fields,
            defaultQuery,
            showCombinatorsBetweenRules,
            ...flags,
            controlElements: viaRealEditors,
          },
        });
      }
    }

    const strays = Object.fromEntries(
      Object.entries(received)
        .map(([key, got]) => [key, [...got].filter(k => !propKeysOf(key).includes(k)).toSorted()])
        .filter(([, extra]) => (extra as string[]).length > 0)
    );
    expect(strays).toEqual({});
    // Guard against the assertion above passing because nothing rendered. `actionElement` is the
    // only key with no direct rendering path — it is a bulk override, always shadowed by a
    // specific `*Action` key — so every other probe must have recorded at least one prop.
    expect(
      Object.entries(received)
        .filter(([k, got]) => got.size === 0 && k !== 'actionElement')
        .map(([k]) => k)
    ).toEqual([]);
  });
});
