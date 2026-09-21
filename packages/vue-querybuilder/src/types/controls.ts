import type { ControlKey, FullField } from '@react-querybuilder/core';
import type { Component, Slot } from 'vue';
import type {
  ActionProps,
  CombinatorSelectorProps,
  FieldSelectorProps,
  InlineCombinatorProps,
  MatchModeEditorProps,
  NotToggleProps,
  OperatorSelectorProps,
  RuleGroupProps,
  RuleProps,
  ShiftActionsProps,
  UndoRedoActionsProps,
  ValueEditorProps,
  ValueSelectorProps,
  ValueSourceSelectorProps,
} from './props.js';

/**
 * The props each subcomponent receives.
 *
 * The single source of truth for the subcomponent list: {@link ControlElementsProp},
 * {@link Controls}, and {@link ControlSlots} are all derived from it, so the key set, the
 * component prop types, and the slot argument types cannot drift apart.
 *
 * There is no `dragHandle` entry: drag-and-drop is a non-goal. There are no
 * `ruleGroupHeaderElements`/`ruleGroupBodyElements` entries either; to customize the contents of
 * a group's header or body, use a replacement `ruleGroup` component (or a slot).
 *
 * @group Props
 */
export type ControlPropsMap<F extends FullField, O extends string> = {
  /**
   * Default component for all button-type controls.
   *
   * @default ActionElement
   */
  actionElement: ActionProps;
  /**
   * Adds a sub-group to the current group.
   *
   * @default ActionElement
   */
  addGroupAction: ActionProps;
  /**
   * Adds a rule to the current group.
   *
   * @default ActionElement
   */
  addRuleAction: ActionProps;
  /**
   * Clones the current group.
   *
   * @default ActionElement
   */
  cloneGroupAction: ActionProps;
  /**
   * Clones the current rule.
   *
   * @default ActionElement
   */
  cloneRuleAction: ActionProps;
  /**
   * Selects the `combinator` property for the current group, or the current independent
   * combinator value.
   *
   * @default ValueSelector
   */
  combinatorSelector: CombinatorSelectorProps;
  /**
   * Selects the `field` property for the current rule.
   *
   * @default ValueSelector
   */
  fieldSelector: FieldSelectorProps<F>;
  /**
   * A small wrapper around the `combinatorSelector` component.
   *
   * @default InlineCombinator
   */
  inlineCombinator: InlineCombinatorProps;
  /**
   * Locks the current group (sets the `disabled` property to `true`).
   *
   * @default ActionElement
   */
  lockGroupAction: ActionProps;
  /**
   * Locks the current rule (sets the `disabled` property to `true`).
   *
   * @default ActionElement
   */
  lockRuleAction: ActionProps;
  /**
   * Mutes the current group (sets the `muted` property to `true`).
   *
   * @default ActionElement
   */
  muteGroupAction: ActionProps;
  /**
   * Mutes the current rule (sets the `muted` property to `true`).
   *
   * @default ActionElement
   */
  muteRuleAction: ActionProps;
  /**
   * Selects the `match` property for the current rule.
   *
   * @default MatchModeEditor
   */
  matchModeEditor: MatchModeEditorProps;
  /**
   * Toggles the `not` property of the current group between `true` and `false`.
   *
   * @default NotToggle
   */
  notToggle: NotToggleProps;
  /**
   * Selects the `operator` property for the current rule.
   *
   * @default ValueSelector
   */
  operatorSelector: OperatorSelectorProps;
  /**
   * Removes the current group from its parent group's `rules` array.
   *
   * @default ActionElement
   */
  removeGroupAction: ActionProps;
  /**
   * Removes the current rule from its parent group's `rules` array.
   *
   * @default ActionElement
   */
  removeRuleAction: ActionProps;
  /**
   * Rule layout component.
   *
   * @default Rule
   */
  rule: RuleProps;
  /**
   * Rule group layout component.
   *
   * @default RuleGroup
   */
  ruleGroup: RuleGroupProps<F, O>;
  /**
   * Shifts the current rule/group up or down in the query hierarchy.
   *
   * @default ShiftActions
   */
  shiftActions: ShiftActionsProps;
  /**
   * Undo/redo buttons for the outermost group, rendered when the `showUndoRedo` prop is `true`.
   *
   * @default UndoRedoActions
   */
  undoRedoActions: UndoRedoActionsProps;
  /**
   * Updates the `value` property for the current rule.
   *
   * @default ValueEditor
   */
  valueEditor: ValueEditorProps<F, O>;
  /**
   * Default component for all value selector controls.
   *
   * @default ValueSelector
   */
  valueSelector: ValueSelectorProps;
  /**
   * Selects the `valueSource` property for the current rule.
   *
   * @default ValueSelector
   */
  valueSourceSelector: ValueSourceSelectorProps;
};

/**
 * The control keys {@link ControlProps} accepts: core's canonical {@link ControlKey} list,
 * narrowed to the keys this port actually renders (no `dragHandle`, no
 * `ruleGroupHeaderElements`/`ruleGroupBodyElements`).
 *
 * Deriving from `ControlKey` rather than from `keyof ControlPropsMap` is the point — the port
 * cannot invent a key core does not have.
 *
 * @group Props
 */
export type ControlPropsKey = Extract<ControlKey, keyof ControlPropsMap<FullField, string>>;

/**
 * The props a given control key receives.
 *
 * For authors of replacement controls: derive your `defineProps` from this so it cannot drift
 * from what the rendering parent actually passes. Declaring a subset is fine — the parent passes
 * the full bag regardless:
 *
 * ```ts
 * defineProps<Pick<ControlProps<'valueEditor'>, 'value' | 'handleOnChange'>>();
 * ```
 *
 * @group Props
 */
export type ControlProps<
  K extends ControlPropsKey,
  F extends FullField = FullField,
  O extends string = string,
> = ControlPropsMap<F, O>[K];

/**
 * The keys of {@link ControlPropsMap} that cannot be set to `null`.
 *
 * `rule`, `ruleGroup`, and the two defaults-for-a-family entries always have to render something.
 *
 * @group Props
 */
export type NonNullableControlKey = 'actionElement' | 'rule' | 'ruleGroup' | 'valueSelector';

/**
 * The type of a replacement subcomponent.
 *
 * Deliberately unparameterized. The rendering parent always passes the full prop bag, so a
 * replacement is free to declare only the props it uses — or none at all, reaching `schema`,
 * `actions`, and the current node through `useSchema`, `useQueryBuilderActions`,
 * `useCurrentRule`, `useCurrentRuleGroup`, and `useCurrentPath` instead.
 *
 * A `Component<P>` cannot express that, and does not enforce what it appears to. Vue passes that
 * type argument through as the *instance* type of the constructor member, so a component
 * declaring nothing in common with `P` trips TypeScript's weak-type detection and is rejected —
 * while a component declaring a prop of the **wrong** type still slips through the
 * options-object member of the union. The check rejects the useful case and misses the broken
 * one, so it is not worth having.
 *
 * {@link ControlPropsMap} is the contract instead. It is enforced where enforcement works: on
 * the slot arguments in {@link ControlSlots}, and on the props each default control declares.
 *
 * @group Props
 */
export type ControlComponent = Component;

/**
 * Subcomponents.
 *
 * Derived from {@link ControlPropsMap}. Every entry accepts `null` — rendering nothing in that
 * position — except {@link NonNullableControlKey}.
 *
 * @group Props
 */
export type ControlElementsProp<F extends FullField, O extends string> = Partial<{
  [K in keyof ControlPropsMap<F, O>]:
    | ControlComponent
    | (K extends NonNullableControlKey ? never : null);
}>;

/**
 * All subcomponents, finalized: every key is present and non-nullable. `null` entries in
 * {@link ControlElementsProp} are replaced with a component that renders nothing, so no call
 * site needs a null check.
 *
 * Unlike React Query Builder, `undoRedoActions` is non-nullable: `QueryManager` owns the
 * history, so this package always ships a working implementation.
 *
 * @group Props
 */
export type Controls<F extends FullField, O extends string> = {
  [K in keyof ControlPropsMap<F, O>]-?: ControlComponent;
};

/**
 * Slot-based alternatives to {@link ControlElementsProp}.
 *
 * Every control element key `x` has a matching scoped slot `#x`, whose slot props are exactly
 * the props the corresponding component would have received. Slots take precedence over
 * `controlElements` at the same level (see `mergeControlElements`), so a `#valueEditor` slot
 * wins over `controlElements.valueEditor`.
 *
 * There is no `null` form: omit the slot to fall through to the next source, or pass
 * `controlElements: { x: null }` to render nothing.
 *
 * Unlike a {@link ControlComponent} entry, a slot's arguments are exactly typed: the slot list
 * and its argument types are both derived from {@link ControlPropsMap}, so neither can drift from
 * the components the slots replace.
 *
 * @group Props
 */
export type ControlSlots<F extends FullField, O extends string> = Partial<{
  [K in keyof ControlPropsMap<F, O>]: Slot<ControlPropsMap<F, O>[K]>;
}>;
