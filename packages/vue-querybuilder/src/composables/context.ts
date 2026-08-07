import type {
  Classnames,
  FullField,
  QueryBuilderFlags,
  ValidationMap,
} from '@react-querybuilder/core';
import {
  defaultTranslations,
  mergeAnyTranslations,
  mergeClassnames,
  preferFlagProps,
  preferProp,
} from '@react-querybuilder/core';
import type { Component, ComputedRef, InjectionKey, MaybeRefOrGetter, Slot } from 'vue';
import { computed, getCurrentInstance, inject, provide, toValue } from 'vue';
import { slotToComponent } from '../internal/slotToComponent.js';
import type { ControlElementsProp, Controls, ControlSlots } from '../types/controls.js';
import type { QueryBuilderContextProps } from '../types/props.js';
import type { Translations, TranslationsFull } from '../types/translations.js';

/**
 * Module-private injection key. Not exported, so the only way in or out is
 * {@link provideQueryBuilderContext}/{@link useQueryBuilderContext}.
 */
const contextKey: InjectionKey<ComputedRef<QueryBuilderContextProps>> = Symbol(
  '@react-querybuilder/vue'
) as InjectionKey<ComputedRef<QueryBuilderContextProps>>;

const emptyObject = {} as const;

/**
 * A component that renders nothing.
 *
 * Used in place of a `null` entry in the `controlElements` prop so that every key of
 * {@link Controls} is always a renderable component and no call site needs a null check.
 *
 * A functional component, never an SFC: an SFC's template emits whitespace text nodes, which
 * would break the byte-level DOM parity the conformance suite asserts.
 */
// oxlint-disable-next-line typescript/no-explicit-any
export const nullComponent: Component<any> = () => null;

/**
 * An empty {@link ValidationMap}, for queries with no validator.
 *
 * A module-level constant so that repeated derivations keep reference identity.
 */
export const emptyValidationMap: ValidationMap = {};

/**
 * Provides the query builder configuration to descendant components.
 *
 * Carries configuration only — query state lives in the `QueryManager` — so nothing here is
 * stateful. The value may be a ref, a getter, or a plain object; it is normalized to a
 * `computed` so that descendants see updates.
 *
 * Must be called during `setup`.
 */
export const provideQueryBuilderContext = <
  F extends FullField = FullField,
  O extends string = string,
>(
  value: MaybeRefOrGetter<QueryBuilderContextProps<F, O>>
): void => {
  provide(
    contextKey,
    computed(() => toValue(value)) as unknown as ComputedRef<QueryBuilderContextProps>
  );
};

/**
 * The inherited {@link QueryBuilderContextProps}, or `undefined` when there is no provider.
 *
 * Safe to call outside of `setup` (as in a unit test), where it always returns `undefined`.
 */
export const useQueryBuilderContext = <
  F extends FullField = FullField,
  O extends string = string,
>(): ComputedRef<QueryBuilderContextProps<F, O>> | undefined =>
  getCurrentInstance()
    ? (inject(contextKey, undefined) as ComputedRef<QueryBuilderContextProps<F, O>> | undefined)
    : undefined;

/**
 * A control element key that is overridden in bulk by `actionElement`.
 */
const isActionKey = (key: string): boolean => key.endsWith('Action') || key.endsWith('Actions');

/**
 * A control element key that is overridden in bulk by `valueSelector`.
 */
const isSelectorKey = (key: string): boolean => key.endsWith('Selector');

/**
 * Every key of {@link Controls}, in a stable order.
 */
export const controlKeys = [
  'actionElement',
  'addGroupAction',
  'addRuleAction',
  'cloneGroupAction',
  'cloneRuleAction',
  'combinatorSelector',
  'fieldSelector',
  'inlineCombinator',
  'lockGroupAction',
  'lockRuleAction',
  'matchModeEditor',
  'muteGroupAction',
  'muteRuleAction',
  'notToggle',
  'operatorSelector',
  'removeGroupAction',
  'removeRuleAction',
  'rule',
  'ruleGroup',
  'shiftActions',
  'undoRedoActions',
  'valueEditor',
  'valueSelector',
  'valueSourceSelector',
] as const satisfies readonly (keyof Controls<FullField, string>)[];

/**
 * The wrapped component for a named slot, or `undefined` if that slot is absent.
 */
const slotFor = <F extends FullField, O extends string>(
  source: ControlSlots<F, O>,
  slotKey: string
  // oxlint-disable-next-line typescript/no-explicit-any
): Component<any> | undefined => {
  const slot = (source as Record<string, Slot | undefined>)[slotKey];
  return slot ? slotToComponent(slot as Slot<Record<string, unknown>>) : undefined;
};

/**
 * Merges `controlElements` and slots from props, context, and defaults, giving precedence to
 * props.
 *
 * Mirrors React Query Builder's `useMergedContext`: a `null` entry resolves to
 * {@link nullComponent} (rendering nothing), `actionElement` is a bulk override for every
 * `*Action`/`*Actions` key, and `valueSelector` is a bulk override for every `*Selector` key.
 * Bulk overrides never apply to `valueEditor`, `rule`, `ruleGroup`, `inlineCombinator`,
 * `notToggle`, or `matchModeEditor`.
 *
 * Slots are the Vue-native customization point and are resolved first. Within a level the order
 * is: keyed slot, keyed component, bulk slot, bulk component. Levels are then tried in order —
 * props, context, defaults — so a slot passed to `QueryBuilder` beats a component inherited from
 * context, and a `null` entry short-circuits at its own level, beating an inherited slot.
 *
 * Defaults are a parameter rather than an import so that this module — and the composable layer
 * as a whole — stays free of component imports.
 */
export const mergeControlElements = <F extends FullField, O extends string>(
  propsCE: ControlElementsProp<F, O> = emptyObject,
  contextCE: ControlElementsProp<F, O> = emptyObject,
  defaults: Partial<Controls<F, O>> = emptyObject,
  propsSlots: ControlSlots<F, O> = emptyObject,
  contextSlots: ControlSlots<F, O> = emptyObject
): Controls<F, O> => {
  const merged: Record<string, unknown> = {};

  for (const key of controlKeys) {
    /**
     * Resolves one level (props or context) to a component, {@link nullComponent}, or
     * `undefined` meaning "fall through to the next level".
     */
    const resolveLevel = (
      ce: ControlElementsProp<F, O>,
      sl: ControlSlots<F, O>
      // oxlint-disable-next-line typescript/no-explicit-any
    ): Component<any> | undefined => {
      const keyed = slotFor(sl, key);
      if (keyed) return keyed;

      const comp = ce[key];
      if (comp === null) return nullComponent;
      if (comp) return comp;

      const bulkSlot =
        (isActionKey(key) ? slotFor(sl, 'actionElement') : undefined) ??
        (isSelectorKey(key) ? slotFor(sl, 'valueSelector') : undefined);
      if (bulkSlot) return bulkSlot;

      return (
        (isActionKey(key) ? ce.actionElement : undefined) ??
        (isSelectorKey(key) ? ce.valueSelector : undefined)
      );
    };

    const comp =
      resolveLevel(propsCE, propsSlots) ?? resolveLevel(contextCE, contextSlots) ?? defaults[key];

    if (comp) merged[key] = comp;
  }

  return merged as Controls<F, O>;
};

/**
 * Merged translations: props > context > `defaultTranslations`.
 */
export const mergeTranslations = (
  propsT?: Partial<Translations>,
  contextT?: Partial<Translations>
): TranslationsFull =>
  mergeAnyTranslations(
    defaultTranslations as unknown as Record<string, Record<string, unknown>>,
    contextT as Record<string, Record<string, unknown>> | undefined,
    propsT as Record<string, Record<string, unknown>> | undefined
  ) as unknown as TranslationsFull;

/**
 * The fully resolved configuration for a query builder.
 */
export interface MergedQueryBuilderConfig<F extends FullField, O extends string> extends Required<
  Omit<QueryBuilderFlags, 'preserveQueryStateOnUnmount'>
> {
  classNames: Classnames;
  controls: Controls<F, O>;
  translations: TranslationsFull;
}

/**
 * Merges props, inherited context, and package defaults into a single configuration object,
 * with props taking precedence.
 *
 * `enableDragAndDrop` is always `false`; drag-and-drop is a non-goal. The flag is retained only
 * because it feeds the `data-dnd` attribute on the wrapper element, which DOM parity requires.
 */
export const mergeQueryBuilderConfig = <F extends FullField, O extends string>({
  props = emptyObject,
  context,
  defaultControls,
}: {
  props?: QueryBuilderContextProps<F, O>;
  context?: QueryBuilderContextProps<F, O>;
  defaultControls?: Partial<Controls<F, O>>;
}): MergedQueryBuilderConfig<F, O> => {
  const flags = preferFlagProps(props, context, true) as Required<QueryBuilderFlags>;

  return {
    ...flags,
    // Never enabled: drag-and-drop is a non-goal for this package.
    enableDragAndDrop: false,
    debugMode: preferProp(false, props.debugMode, context?.debugMode),
    classNames: mergeClassnames(context?.controlClassnames, props.controlClassnames),
    controls: mergeControlElements(
      props.controlElements,
      context?.controlElements,
      defaultControls,
      props.slots,
      context?.slots
    ),
    translations: mergeTranslations(props.translations, context?.translations),
  };
};
