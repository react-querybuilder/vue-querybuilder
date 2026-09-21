import type { RuleGroupTypeAny } from '@react-querybuilder/core';
import {
  derivePathInfo,
  deriveRuleGroupClassNames,
  deriveRuleGroupContext,
  deriveRuleGroupOuterClassName,
  getParentPath,
  getValidationClassNames,
} from '@react-querybuilder/core';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { computed, toValue } from 'vue';
import type { RuleGroupProps } from '../types/props.js';

// oxlint-disable-next-line typescript/no-explicit-any
type AnyContext = any;

/** A click handler that also receives the arbitrary `context` an action element may pass. */
type ActionHandler = (event?: MouseEvent, context?: AnyContext) => void;

/**
 * Everything `RuleGroup`, `RuleGroupHeader`, and `RuleGroupBody` need, derived from
 * {@link RuleGroupProps}.
 *
 * As with {@link useRule}, React's `useMemo` graph at `RuleGroup.tsx:563-740` is a dependency
 * spec: the class names come from core's `deriveRuleGroup*ClassNames`, the resolved
 * configuration from `deriveRuleGroupContext`, and the child paths from `derivePathInfo`.
 */
export interface UseRuleGroupReturn {
  /**
   * The group as rendered. A group with no `combinator` of its own resolves to the first
   * configured combinator, and the copy carries it so subcomponents see a consistent value.
   */
  readonly ruleGroup: ComputedRef<RuleGroupTypeAny>;
  readonly combinator: ComputedRef<string>;
  readonly disabled: ComputedRef<boolean>;
  readonly muted: ComputedRef<boolean>;
  readonly validationResult: ComputedRef<
    ReturnType<typeof deriveRuleGroupContext>['validationResult']
  >;
  readonly classNames: ComputedRef<ReturnType<typeof deriveRuleGroupClassNames>>;
  readonly outerClassName: ComputedRef<string>;
  readonly accessibleDescription: ComputedRef<string>;
  /** Per-child path and disabled state, in `ruleGroup.rules` order. */
  readonly pathsMemo: ComputedRef<ReturnType<typeof derivePathInfo>>;
  readonly onCombinatorChange: (value: AnyContext) => void;
  readonly onIndependentCombinatorChange: (value: AnyContext, index: number) => void;
  readonly onNotToggleChange: (checked: boolean) => void;
  readonly addRule: ActionHandler;
  readonly addGroup: ActionHandler;
  readonly cloneGroup: ActionHandler;
  readonly ungroup: ActionHandler;
  readonly toggleLockGroup: ActionHandler;
  readonly toggleMuteGroup: ActionHandler;
  readonly removeGroup: ActionHandler;
  readonly shiftGroupUp: ActionHandler;
  readonly shiftGroupDown: ActionHandler;
}

/** Wraps an action handler so it stops the triggering event from propagating. */
const stopPropagation =
  (method: ActionHandler): ActionHandler =>
  (event, context) => {
    event?.preventDefault();
    event?.stopPropagation();
    method(event, context);
  };

/**
 * Derives the rendering state for a rule group.
 *
 * Accepts a getter or ref as well as a plain props object, for the same reason as
 * {@link useRule}: a subquery's group is not in the manager's query.
 */
export const useRuleGroup = (props: MaybeRefOrGetter<RuleGroupProps>): UseRuleGroupReturn => {
  const p = computed(() => toValue(props));
  const schema = computed(() => p.value.schema);
  const path = computed(() => p.value.path);

  const disabled = computed(() => !!p.value.parentDisabled || !!p.value.disabled);
  const muted = computed(() => !!p.value.parentMuted || !!p.value.ruleGroup.muted);

  const ctx = computed(() =>
    deriveRuleGroupContext(p.value.ruleGroup, schema.value.combinators, {
      validationMap: schema.value.validationMap,
      id: p.value.id,
    })
  );

  const ruleGroup = computed((): RuleGroupTypeAny => {
    if (
      schema.value.independentCombinators ||
      p.value.ruleGroup.combinator === ctx.value.combinator
    ) {
      return p.value.ruleGroup;
    }
    return { ...p.value.ruleGroup, combinator: ctx.value.combinator } as RuleGroupTypeAny;
  });

  const classNames = computed(() =>
    deriveRuleGroupClassNames({
      classNames: schema.value.classNames,
      suppressStandardClassnames: schema.value.suppressStandardClassnames,
    })
  );

  const outerClassName = computed(() =>
    deriveRuleGroupOuterClassName({
      classNames: schema.value.classNames,
      suppressStandardClassnames: schema.value.suppressStandardClassnames,
      leadingClassNames: [
        schema.value.getRuleGroupClassname(ruleGroup.value),
        ctx.value.combinatorBasedClassName,
      ],
      disabled: disabled.value,
      muted: muted.value,
      validationClassName: getValidationClassNames(ctx.value.validationResult),
    })
  );

  const pathsMemo = computed(() =>
    derivePathInfo(path.value, ruleGroup.value.rules.length, {
      disabled: disabled.value,
      disabledPaths: schema.value.disabledPaths,
    })
  );

  const accessibleDescription = computed(() =>
    // There is no `qbId` in this package; the default generator ignores it.
    schema.value.accessibleDescriptionGenerator({ path: path.value, qbId: '' })
  );

  const onCombinatorChange = (value: AnyContext): void => {
    if (!disabled.value) p.value.actions.onPropChange('combinator', value, path.value);
  };

  const onIndependentCombinatorChange = (value: AnyContext, index: number): void => {
    if (!disabled.value) p.value.actions.onPropChange('combinator', value, [...path.value, index]);
  };

  const onNotToggleChange = (checked: boolean): void => {
    if (!disabled.value) p.value.actions.onPropChange('not', checked, path.value);
  };

  const addRule = stopPropagation((_event, context) => {
    if (!disabled.value) p.value.actions.onRuleAdd(schema.value.createRule(), path.value, context);
  });

  const addGroup = stopPropagation((_event, context) => {
    if (!disabled.value) {
      p.value.actions.onGroupAdd(schema.value.createRuleGroup(), path.value, context);
    }
  });

  const cloneGroup = stopPropagation(() => {
    if (!disabled.value) {
      p.value.actions.moveRule(
        path.value,
        [...getParentPath(path.value), path.value.at(-1)! + 1],
        true
      );
    }
  });

  const toggleLockGroup = stopPropagation(() => {
    p.value.actions.onPropChange('disabled', !disabled.value, path.value);
  });

  const toggleMuteGroup = stopPropagation(() => {
    p.value.actions.onPropChange('muted', !ruleGroup.value.muted, path.value);
  });

  const removeGroup = stopPropagation(() => {
    if (!disabled.value) p.value.actions.onGroupRemove(path.value);
  });

  const ungroup = stopPropagation(() => {
    if (!disabled.value) p.value.actions.ungroupRuleGroup(path.value);
  });

  const shiftGroupUp = stopPropagation(event => {
    if (!disabled.value && !p.value.shiftUpDisabled) {
      p.value.actions.moveRule(path.value, 'up', event?.altKey);
    }
  });

  const shiftGroupDown = stopPropagation(event => {
    if (!disabled.value && !p.value.shiftDownDisabled) {
      p.value.actions.moveRule(path.value, 'down', event?.altKey);
    }
  });

  return {
    ruleGroup,
    combinator: computed(() => ctx.value.combinator),
    disabled,
    muted,
    validationResult: computed(() => ctx.value.validationResult),
    classNames,
    outerClassName,
    accessibleDescription,
    pathsMemo,
    onCombinatorChange,
    onIndependentCombinatorChange,
    onNotToggleChange,
    addRule,
    addGroup,
    cloneGroup,
    ungroup,
    toggleLockGroup,
    toggleMuteGroup,
    removeGroup,
    shiftGroupUp,
    shiftGroupDown,
  };
};
