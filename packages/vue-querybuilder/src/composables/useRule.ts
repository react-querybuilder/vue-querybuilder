import type { FullField, RuleContextResolvers } from '@react-querybuilder/core';
import {
  deriveRuleClassNames,
  deriveRuleContext,
  deriveRuleOuterClassName,
  getParentPath,
  getValidationClassNames,
  isPojo,
  lc,
} from '@react-querybuilder/core';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { computed, toValue } from 'vue';
import type { RuleProps } from '../types/props.js';
import type { LabelNode } from '../types/translations.js';

// oxlint-disable-next-line typescript/no-explicit-any
type AnyContext = any;

/** A click handler that also receives the arbitrary `context` an action element may pass. */
type ActionHandler = (event?: MouseEvent, context?: AnyContext) => void;

/** A change handler that also receives the arbitrary `context` a selector may pass. */
type ChangeHandler = (value: AnyContext, context?: AnyContext) => void;

/**
 * Everything `Rule` and `RuleComponents` need, derived from {@link RuleProps}.
 *
 * Class names come from core's `deriveRule*ClassNames`, and the resolved rule configuration from
 * core's `deriveRuleContext`. React's `useMemo` graph at `Rule.tsx:549-760` is a dependency
 * spec, not code to translate: most of it collapses into those two calls.
 */
export interface UseRuleReturn {
  readonly ctx: ComputedRef<ReturnType<typeof deriveRuleContext<FullField>>>;
  readonly disabled: ComputedRef<boolean>;
  readonly muted: ComputedRef<boolean>;
  readonly classNames: ComputedRef<ReturnType<typeof deriveRuleClassNames>>;
  readonly outerClassName: ComputedRef<string>;
  readonly fieldData: ComputedRef<FullField>;
  readonly valueEditorSeparator: ComputedRef<LabelNode>;
  /** Whether this rule's field supports match modes, i.e. whether it renders a subquery. */
  readonly hasSubQuery: ComputedRef<boolean>;
  readonly showFieldSelector: ComputedRef<boolean>;
  readonly showValueControls: ComputedRef<boolean>;
  readonly showValueSourceSelector: ComputedRef<boolean>;
  readonly onChangeField: ChangeHandler;
  readonly onChangeOperator: ChangeHandler;
  readonly onChangeMatchMode: ChangeHandler;
  readonly onChangeValueSource: ChangeHandler;
  readonly onChangeValue: ChangeHandler;
  readonly cloneRule: ActionHandler;
  readonly toggleLockRule: ActionHandler;
  readonly toggleMuteRule: ActionHandler;
  readonly removeRule: ActionHandler;
  readonly shiftRuleUp: ActionHandler;
  readonly shiftRuleDown: ActionHandler;
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
 * Derives the rendering state for a rule.
 *
 * Accepts a getter or ref as well as a plain props object so that `RuleSubQuery` and
 * `RuleComponents` can synthesize a still-reactive props object for a node that is not in the
 * manager's query. That is the only place the getter convention is needed — an ordinary Vue
 * props object is already a reactive proxy.
 */
export const useRule = (props: MaybeRefOrGetter<RuleProps>): UseRuleReturn => {
  const p = computed(() => toValue(props));
  const schema = computed(() => p.value.schema);
  const rule = computed(() => p.value.rule);
  const path = computed(() => p.value.path);

  const disabled = computed(() => !!p.value.parentDisabled || !!p.value.disabled);
  const muted = computed(() => !!p.value.parentMuted || !!rule.value.muted);

  const classNames = computed(() =>
    deriveRuleClassNames({
      classNames: schema.value.classNames,
      suppressStandardClassnames: schema.value.suppressStandardClassnames,
    })
  );

  // Resolved from `schema` rather than `schema.manager.getRuleContext(path)` so that a
  // replacement `rule` component — or a subquery, whose rules are not in the manager's query at
  // all — can still be rendered.
  const resolvers = computed(
    () =>
      ({
        fields: schema.value.fields,
        fieldMap: schema.value.fieldMap,
        getInputType: schema.value.getInputType,
        getMatchModes: schema.value.getMatchModes,
        getOperators: schema.value.getOperators,
        getParameters: schema.value.getParameters,
        getValueEditorType: schema.value.getValueEditorType,
        getValues: schema.value.getValues,
        getValueSources: schema.value.getValueSources,
        getSubQueryBuilderProps: schema.value.getSubQueryBuilderProps,
      }) as unknown as RuleContextResolvers<FullField>
  );

  const ctx = computed(() =>
    deriveRuleContext(rule.value, resolvers.value, {
      validationMap: schema.value.validationMap,
      id: p.value.id,
    })
  );

  const fieldData = computed(() => ctx.value.fieldData);
  const valueEditorSeparator = computed(() =>
    schema.value.getValueEditorSeparator(rule.value.field, rule.value.operator, {
      fieldData: fieldData.value,
    })
  );

  const hasSubQuery = computed(() => ctx.value.matchModes.length > 0);

  const outerClassName = computed(() =>
    deriveRuleOuterClassName({
      classNames: schema.value.classNames,
      suppressStandardClassnames: schema.value.suppressStandardClassnames,
      leadingClassNames: [
        schema.value.getRuleClassname(rule.value, { fieldData: fieldData.value }),
        fieldData.value?.className ?? '',
        ctx.value.operatorObject?.className ?? '',
      ],
      disabled: disabled.value,
      muted: muted.value,
      hasSubQuery: hasSubQuery.value,
      validationClassName: getValidationClassNames(ctx.value.validationResult),
    })
  );

  const changeHandler =
    (prop: string): ChangeHandler =>
    (value, context) => {
      if (!disabled.value) {
        p.value.actions.onPropChange(prop as never, value, path.value, context);
      }
    };

  const onChangeField = changeHandler('field');
  const onChangeOperator = changeHandler('operator');
  const onChangeMatchMode = changeHandler('match');
  const onChangeValueSource = changeHandler('valueSource');
  const onChangeValue = changeHandler('value');

  const cloneRule = stopPropagation((_event, context) => {
    if (!disabled.value) {
      p.value.actions.moveRule(
        path.value,
        [...getParentPath(path.value), path.value.at(-1)! + 1],
        true,
        context
      );
    }
  });

  const toggleLockRule = stopPropagation((_event, context) => {
    p.value.actions.onPropChange('disabled', !disabled.value, path.value, context);
  });

  const toggleMuteRule = stopPropagation((_event, context) => {
    p.value.actions.onPropChange('muted', !rule.value.muted, path.value, context);
  });

  const removeRule = stopPropagation(() => {
    if (!disabled.value) p.value.actions.onRuleRemove(path.value);
  });

  const shiftRuleUp = stopPropagation((event, context) => {
    if (!disabled.value && !p.value.shiftUpDisabled) {
      p.value.actions.moveRule(path.value, 'up', event?.altKey, context);
    }
  });

  const shiftRuleDown = stopPropagation((event, context) => {
    if (!disabled.value && !p.value.shiftDownDisabled) {
      p.value.actions.moveRule(path.value, 'down', event?.altKey, context);
    }
  });

  // Hidden only when the sole configured field is the placeholder, which has an empty `value`.
  const showFieldSelector = computed(
    () =>
      !(
        schema.value.fields.length === 1 &&
        isPojo(schema.value.fields[0]) &&
        'value' in schema.value.fields[0] &&
        schema.value.fields[0].value === ''
      )
  );

  const showValueControls = computed(
    () =>
      (schema.value.autoSelectOperator ||
        rule.value.operator !== p.value.translations.operators?.placeholderName) &&
      !ctx.value.hideValueControls
  );

  const showValueSourceSelector = computed(
    () =>
      !['null', 'notnull'].includes(lc(`${rule.value.operator}`)) &&
      ctx.value.valueSources.length > 1
  );

  return {
    ctx,
    disabled,
    muted,
    classNames,
    outerClassName,
    fieldData,
    valueEditorSeparator,
    hasSubQuery,
    showFieldSelector,
    showValueControls,
    showValueSourceSelector,
    onChangeField,
    onChangeOperator,
    onChangeMatchMode,
    onChangeValueSource,
    onChangeValue,
    cloneRule,
    toggleLockRule,
    toggleMuteRule,
    removeRule,
    shiftRuleUp,
    shiftRuleDown,
  };
};
