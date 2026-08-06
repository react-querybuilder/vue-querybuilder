import { defaultTranslations } from '@react-querybuilder/core';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  controlKeys,
  emptyValidationMap,
  mergeControlElements,
  mergeQueryBuilderConfig,
  mergeTranslations,
  nullComponent,
  provideQueryBuilderContext,
  useQueryBuilderContext,
} from './context.js';

// oxlint-disable-next-line typescript/no-explicit-any
const Stub = (name: string): any => defineComponent({ name, render: () => h('span', name) });

describe('nullComponent', () => {
  it('renders nothing at all — no element, no whitespace text node', () => {
    const wrapper = mount(defineComponent({ render: () => h(nullComponent) }));
    expect(wrapper.html()).toBe('');
  });
});

describe('emptyValidationMap', () => {
  it('is a stable empty object', () => {
    expect(emptyValidationMap).toEqual({});
    expect(emptyValidationMap).toBe(emptyValidationMap);
  });
});

describe('useQueryBuilderContext', () => {
  it('returns undefined outside of setup', () => {
    expect(useQueryBuilderContext()).toBeUndefined();
  });

  it('returns undefined with no provider', () => {
    let received: unknown = 'unset';
    mount(
      defineComponent({
        setup() {
          received = useQueryBuilderContext();
          return () => h('div');
        },
      })
    );
    expect(received).toBeUndefined();
  });

  it('inherits a provided value', () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    let received: any;
    const Child = defineComponent({
      setup() {
        received = useQueryBuilderContext();
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
    expect(received.value).toEqual({ showNotToggle: true });
  });

  it('stays reactive when provided a getter', async () => {
    const flag = ref(false);
    // oxlint-disable-next-line typescript/no-explicit-any
    let received: any;
    const Child = defineComponent({
      setup() {
        received = useQueryBuilderContext();
        return () => h('div');
      },
    });
    mount(
      defineComponent({
        setup() {
          provideQueryBuilderContext(() => ({ showNotToggle: flag.value }));
          return () => h(Child);
        },
      })
    );
    expect(received.value.showNotToggle).toBe(false);
    flag.value = true;
    await nextTick();
    expect(received.value.showNotToggle).toBe(true);
  });
});

describe('mergeControlElements', () => {
  it('populates every key from defaults', () => {
    const defaults = Object.fromEntries(controlKeys.map(k => [k, Stub(k)]));
    const merged = mergeControlElements({}, {}, defaults as never);
    for (const key of controlKeys) {
      expect(merged[key]).toBeDefined();
    }
  });

  it('gives props precedence over context, and context over defaults', () => {
    const fromProps = Stub('props');
    const fromContext = Stub('context');
    const fromDefaults = Stub('defaults');

    expect(
      mergeControlElements({ notToggle: fromProps }, { notToggle: fromContext }, {
        notToggle: fromDefaults,
      } as never).notToggle
    ).toBe(fromProps);

    expect(
      mergeControlElements({}, { notToggle: fromContext }, { notToggle: fromDefaults } as never)
        .notToggle
    ).toBe(fromContext);

    expect(mergeControlElements({}, {}, { notToggle: fromDefaults } as never).notToggle).toBe(
      fromDefaults
    );
  });

  it('resolves a null entry to nullComponent', () => {
    const merged = mergeControlElements({ addRuleAction: null }, {}, {
      addRuleAction: Stub('default'),
    } as never);
    expect(merged.addRuleAction).toBe(nullComponent);
  });

  it('short-circuits a null entry at its own level, beating an inherited component', () => {
    const merged = mergeControlElements(
      { addRuleAction: null },
      { addRuleAction: Stub('context') },
      {} as never
    );
    expect(merged.addRuleAction).toBe(nullComponent);
  });

  it('applies actionElement in bulk to every *Action/*Actions key', () => {
    const bulk = Stub('bulk');
    const merged = mergeControlElements({ actionElement: bulk }, {}, {} as never);
    const actionKeys = controlKeys.filter(
      k => (k.endsWith('Action') || k.endsWith('Actions')) && k !== 'actionElement'
    );
    expect(actionKeys.length).toBeGreaterThan(0);
    for (const key of actionKeys) {
      expect(merged[key]).toBe(bulk);
    }
  });

  it('applies valueSelector in bulk to every *Selector key', () => {
    const bulk = Stub('bulk');
    const merged = mergeControlElements({ valueSelector: bulk }, {}, {} as never);
    const selectorKeys = controlKeys.filter(k => k.endsWith('Selector') && k !== 'valueSelector');
    expect(selectorKeys.length).toBeGreaterThan(0);
    for (const key of selectorKeys) {
      expect(merged[key]).toBe(bulk);
    }
  });

  it('never applies a bulk override to the exempt keys', () => {
    const bulk = Stub('bulk');
    const defaults = Object.fromEntries(controlKeys.map(k => [k, Stub(k)]));
    const merged = mergeControlElements(
      { actionElement: bulk, valueSelector: bulk },
      {},
      defaults as never
    );
    for (const key of [
      'valueEditor',
      'rule',
      'ruleGroup',
      'inlineCombinator',
      'notToggle',
      'matchModeEditor',
    ] as const) {
      expect(merged[key]).not.toBe(bulk);
      expect(merged[key]).toBe(defaults[key]);
    }
  });

  it('prefers a keyed component over a bulk override at the same level', () => {
    const bulk = Stub('bulk');
    const keyed = Stub('keyed');
    const merged = mergeControlElements(
      { actionElement: bulk, addRuleAction: keyed },
      {},
      {} as never
    );
    expect(merged.addRuleAction).toBe(keyed);
    expect(merged.addGroupAction).toBe(bulk);
  });

  it('prefers a bulk override in props over a keyed component in context', () => {
    const bulk = Stub('bulk');
    const merged = mergeControlElements(
      { actionElement: bulk },
      { addRuleAction: Stub('context') },
      {} as never
    );
    expect(merged.addRuleAction).toBe(bulk);
  });

  it('tolerates entirely absent arguments', () => {
    expect(mergeControlElements()).toEqual({});
  });
});

describe('mergeTranslations', () => {
  it('falls back to defaults', () => {
    expect(mergeTranslations().addRule.label).toBe(defaultTranslations.addRule.label);
  });

  it('gives props precedence over context', () => {
    const merged = mergeTranslations(
      { addRule: { label: 'from props' } },
      { addRule: { label: 'from context', title: 'from context' } }
    );
    expect(merged.addRule.label).toBe('from props');
    // Untouched keys still fall through to context, then defaults.
    expect(merged.addRule.title).toBe('from context');
    expect(merged.removeRule.label).toBe(defaultTranslations.removeRule.label);
  });
});

describe('mergeQueryBuilderConfig', () => {
  it('hard-codes enableDragAndDrop to false', () => {
    const config = mergeQueryBuilderConfig({ props: { enableDragAndDrop: true } as never });
    expect(config.enableDragAndDrop).toBe(false);
  });

  it('resolves flags with props taking precedence over context', () => {
    const config = mergeQueryBuilderConfig({
      props: { showNotToggle: true },
      context: { showNotToggle: false, showCloneButtons: true },
    });
    expect(config.showNotToggle).toBe(true);
    expect(config.showCloneButtons).toBe(true);
  });

  it('defaults debugMode to false', () => {
    expect(mergeQueryBuilderConfig({}).debugMode).toBe(false);
    expect(mergeQueryBuilderConfig({ props: { debugMode: true } }).debugMode).toBe(true);
  });

  it('merges classnames, controls, and translations', () => {
    const stub = Stub('rule');
    const config = mergeQueryBuilderConfig({
      props: {
        controlClassnames: { queryBuilder: 'from-props' },
        controlElements: { rule: stub },
        translations: { addRule: { label: '++' } },
      },
      context: { controlClassnames: { ruleGroup: 'from-context' } },
    });
    expect(config.classNames.queryBuilder).toContain('from-props');
    expect(config.classNames.ruleGroup).toContain('from-context');
    expect(config.controls.rule).toBe(stub);
    expect(config.translations.addRule.label).toBe('++');
  });
});
