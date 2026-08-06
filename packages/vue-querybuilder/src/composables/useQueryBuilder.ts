import type {
  Classnames,
  FullCombinator,
  FullField,
  FullOperator,
  FullOption,
  FullOptionList,
  FullOptionRecord,
  GetOptionIdentifierType,
  InputType,
  MatchModeOptions,
  Option,
  Path,
  QueryActions,
  QueryManagerOptions,
  RuleGroupTypeAny,
  RuleType,
  ValueEditorType,
  ValueSourceFullOptions,
} from '@react-querybuilder/core';
import {
  QueryManager,
  deriveQueryBuilderClassNames,
  generateAccessibleDescription,
  getRuleDefaultValue,
  isRuleGroupTypeIC,
  prepareOptionList,
  resolveCandidateQuery,
  resolveDefaultOperator,
  toFlatOptionArray,
  unchangedSignature,
} from '@react-querybuilder/core';
import type { ComputedRef, ShallowRef } from 'vue';
import {
  computed,
  getCurrentInstance,
  onMounted,
  onScopeDispose,
  shallowRef,
  toRaw,
  toValue,
  watch,
} from 'vue';
import type { Controls } from '../types/controls.js';
import type { QueryBuilderContextProps, QueryBuilderProps } from '../types/props.js';
import type { Schema } from '../types/schema.js';
import type { LabelNode, TranslationsFull } from '../types/translations.js';
import type { MergedQueryBuilderConfig } from './context.js';
import { emptyValidationMap, mergeQueryBuilderConfig, useQueryBuilderContext } from './context.js';
import { useQueryActions } from './useQueryActions.js';

const emptyDisabledPaths: Path[] = [];
const defaultGetValueEditorSeparator = (): LabelNode => '';
const defaultGetRuleOrGroupClassname = (): string => '';

/**
 * Everything a `QueryBuilder` component needs to render, derived from its props and driven by a
 * {@link QueryManager}.
 */
export interface QueryBuilderState<F extends FullField, O extends string> {
  /** The current query. Reassigned whenever the manager notifies. */
  readonly query: ShallowRef<RuleGroupTypeAny>;
  /** Alias for {@link QueryBuilderState.query}. */
  readonly rootGroup: ShallowRef<RuleGroupTypeAny>;
  readonly manager: QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>;
  readonly schema: ComputedRef<Schema<F, O>>;
  readonly actions: QueryActions;
  readonly translations: ComputedRef<TranslationsFull>;
  readonly controls: ComputedRef<Controls<F, O>>;
  readonly classNames: ComputedRef<Classnames>;
  readonly wrapperClassName: ComputedRef<string>;
  readonly dndEnabledAttr: string;
  readonly inlineCombinatorsAttr: ComputedRef<string>;
  readonly rootGroupDisabled: ComputedRef<boolean>;
  readonly queryDisabled: ComputedRef<boolean>;
  readonly independentCombinators: ComputedRef<boolean>;
  /** The config to hand to `provideQueryBuilderContext`. */
  readonly context: ComputedRef<QueryBuilderContextProps<F, O>>;
}

/**
 * Options for {@link useQueryBuilder} that cannot be expressed as `QueryBuilderProps`.
 */
export interface UseQueryBuilderOptions<F extends FullField, O extends string> {
  /**
   * Default components for every control, applied last in the `controlElements` merge. Provided
   * by the component layer so that this module stays free of component imports.
   */
  defaultControls?: Partial<Controls<F, O>>;
  /**
   * Inherited context. Defaults to {@link useQueryBuilderContext}, which is only available
   * during `setup`.
   */
  context?: QueryBuilderContextProps<F, O>;
  /**
   * Called with each committed query, after `onQueryChange`. `QueryBuilder.vue` uses it to emit
   * `update:query`, which can only be done from a component.
   */
  writeBack?: (query: RuleGroupTypeAny) => void;
}

/**
 * Builds the reactive state for a query builder.
 *
 * The query lives in a {@link QueryManager}. Pass an externally created manager as the `manager`
 * prop to drive the query from outside the component tree.
 *
 * Structural manager options (`fields`, `operators`, `combinators`, and the boolean flags) are
 * read once, when the manager is constructed. Function props (`getOperators`, `getDefaultValue`,
 * etc.) are forwarded through closures, so those stay live. Rendering always reflects the
 * current props regardless.
 *
 * @param props - The `QueryBuilder` props. A Vue props object is already a reactive proxy, so it
 * can be passed directly; a ref or getter is also accepted.
 */
export const useQueryBuilder = <
  F extends FullField = FullField,
  O extends FullOperator = FullOperator,
>(
  props:
    | QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>
    | (() => QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>),
  options: UseQueryBuilderOptions<F, GetOptionIdentifierType<O>> = {}
): QueryBuilderState<F, GetOptionIdentifierType<O>> => {
  type OName = GetOptionIdentifierType<O>;
  type FName = GetOptionIdentifierType<F>;

  const getProps = (): QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator> =>
    toValue(props) as QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>;

  const inheritedContextRef = useQueryBuilderContext<F, OName>();
  const getInheritedContext = (): QueryBuilderContextProps<F, OName> | undefined =>
    options.context ?? inheritedContextRef?.value;

  const config = computed(
    () =>
      mergeQueryBuilderConfig<F, OName>({
        props: getProps(),
        context: getInheritedContext(),
        defaultControls: options.defaultControls,
      }) satisfies MergedQueryBuilderConfig<F, OName>
  );

  // #region Manager
  const initialProps = getProps();
  const maxLevels = (initialProps.maxLevels ?? 0) > 0 ? Number(initialProps.maxLevels) : Infinity;
  const disabledPathsInit = Array.isArray(initialProps.disabled)
    ? toRaw(initialProps.disabled)
    : emptyDisabledPaths;

  // Read once, outside any effect scope: the manager's structural options are fixed for its
  // lifetime, so tracking them would be misleading.
  const initialConfig = mergeQueryBuilderConfig<F, OName>({
    props: getProps(),
    context: getInheritedContext(),
    defaultControls: options.defaultControls,
  });

  /**
   * Forwards a function prop to the manager through a closure, so later changes to the prop take
   * effect without rebuilding the manager. Returns `undefined` when the prop is absent at
   * initialization, leaving the manager to apply its own precedence rules instead of treating
   * the option as configured.
   */
  const live = <A extends unknown[], R>(
    pick: (props: QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>) => unknown
  ): ((...args: A) => R) | undefined =>
    typeof pick(initialProps) === 'function'
      ? (...args: A) => (pick(getProps()) as (...args: A) => R)(...args)
      : undefined;

  const managerOptions: QueryManagerOptions<F, O, FullCombinator> = {
    fields: toRaw(initialProps.fields),
    operators: toRaw(initialProps.operators),
    combinators: toRaw(initialProps.combinators),
    baseField: toRaw(initialProps.baseField),
    baseOperator: toRaw(initialProps.baseOperator),
    baseCombinator: toRaw(initialProps.baseCombinator),
    autoSelectField: initialConfig.autoSelectField,
    autoSelectOperator: initialConfig.autoSelectOperator,
    autoSelectValue: initialConfig.autoSelectValue,
    // The manager prepares every option list, including the placeholder options, so it needs the
    // merged translations. Everything rendered here reads those lists back off the manager;
    // `prepareOptionList` is deliberately not reimplemented locally.
    translations: initialConfig.translations,
    addRuleToNewGroups: initialConfig.addRuleToNewGroups,
    listsAsArrays: initialConfig.listsAsArrays,
    resetOnFieldChange: initialConfig.resetOnFieldChange,
    resetOnOperatorChange: initialConfig.resetOnOperatorChange,
    maxLevels,
    disabledPaths: disabledPathsInit,
    queryDisabled: initialProps.disabled === true,
    history: true,
    validator: initialProps.validator,
    idGenerator: initialProps.idGenerator,
    // Forwarded so that changes to these props take effect without rebuilding the manager.
    getDefaultField: initialProps.getDefaultField as never,
    getDefaultOperator: (typeof initialProps.getDefaultOperator === 'function'
      ? live(p => p.getDefaultOperator)
      : initialProps.getDefaultOperator) as never,
    getDefaultValue: live(p => p.getDefaultValue) as never,
    getOperators: live(p => p.getOperators) as never,
    getValueEditorType: live(p => p.getValueEditorType) as never,
    getValues: live(p => p.getValues) as never,
    getValueSources: live(p => p.getValueSources) as never,
    getMatchModes: live(p => p.getMatchModes) as never,
    getParameters: live(p => p.getParameters) as never,
    getInputType: live(p => p.getInputType) as never,
    getSubQueryBuilderProps: live(p => p.getSubQueryBuilderProps) as never,
  };

  const manager =
    (toRaw(initialProps.manager) as QueryManager<
      RuleGroupTypeAny,
      F,
      FullOperator,
      FullCombinator
    >) ?? new QueryManager<RuleGroupTypeAny, F, O, FullCombinator>(undefined, managerOptions);

  if (!initialProps.manager) {
    const candidate = resolveCandidateQuery(
      {
        // `toRaw` throughout: the manager deep-freezes what it is given, which throws on a Vue
        // reactive proxy. A parent holding the query in `reactive`/`ref` is the common case.
        query: toRaw(initialProps.query),
        defaultQuery: toRaw(initialProps.defaultQuery),
        fallbackQuery: manager.getQuery(),
      },
      { idGenerator: initialProps.idGenerator }
    );
    if (!Object.is(candidate, manager.getQuery())) {
      manager.setQuery(toRaw(candidate));
      // Seeding the query is not a user action, so it must not be undoable. Without this,
      // `UndoRedoActions` would render an enabled "undo" button on first paint.
      manager.clearHistory();
    }
  }
  // #endregion

  // #region Option lists
  // Read off the manager, which prepares them from the same options — including `translations`,
  // which supplies the placeholder options when `autoSelect*` is `false`. Fixed for the
  // manager's lifetime, so a changed `fields`/`operators`/`combinators`/`translations` prop does
  // not update them.
  const fields = manager.getFields();
  const combinators = manager.getCombinators();
  const fieldMap = Object.fromEntries(
    toFlatOptionArray(fields as FullOptionList<FullOption>).map(f => [f.value ?? f.name, f])
  ) as Partial<FullOptionRecord<F>>;
  // #endregion

  // #region Resolvers
  const getParameters = (
    field?: string,
    operator?: string,
    misc?: { fieldData: F }
  ): FullOptionList<FullOption> =>
    prepareOptionList<FullOption>({
      optionList: getProps().getParameters?.(field as FName, operator as OName, misc) ?? [],
      autoSelectOption: true,
    }).optionList;

  const getOperators = (field: string): FullOptionList<O> =>
    manager.getOperators(field) as FullOptionList<O>;

  const getValueEditorType = (field: string, operator: string): ValueEditorType =>
    manager.getValueEditorType(field, operator);

  const getValues = (field: string, operator: string): FullOptionList<Option> =>
    manager.getValues(field, operator);

  const getValueSources = (field: string, operator: string): ValueSourceFullOptions =>
    manager.getValueSources(field, operator);

  const getMatchModes = (field: string): MatchModeOptions => manager.getMatchModes(field);

  const getInputType = (
    field: string,
    operator: string,
    { fieldData }: { fieldData: F }
  ): InputType | null =>
    getProps().getInputType?.(field as FName, operator as OName, { fieldData }) ?? 'text';

  const getSubQueryBuilderProps = (
    field: string,
    misc: { fieldData: F }
    // oxlint-disable-next-line typescript/no-explicit-any
  ): any => getProps().getSubQueryBuilderProps?.(field as FName, misc) ?? {};

  // The manager computes rule defaults internally for `createRule`; these expose the same
  // derivation to the schema, so they must stay in sync with the manager's option lists.
  const getRuleDefaultValueMain = (rule: RuleType): unknown =>
    getRuleDefaultValue<F>(rule, {
      fieldData: manager.getFieldData(rule.field),
      fields,
      getParameters,
      getValueEditorType,
      getValues,
      listsAsArrays: config.value.listsAsArrays,
      getDefaultValue: getProps().getDefaultValue as never,
    });

  const getRuleDefaultOperator = (field: string): string =>
    resolveDefaultOperator<F>({
      field,
      fieldData: manager.getFieldData(field),
      getDefaultOperator: getProps().getDefaultOperator as never,
      getOperators,
    });
  // #endregion

  // #region Query state
  // `shallowRef`, not `ref`: queries are immutable and are replaced wholesale, and a deep proxy
  // would both defeat the reference comparisons this design rests on and be rejected by the
  // manager's Immer deep-freeze.
  const query = shallowRef<RuleGroupTypeAny>(manager.getQuery());

  /**
   * Publishes a committed query. Called from the manager subscription rather than from a
   * separate watcher, so it fires exactly once per commit — including inside `manager.batch()`,
   * which notifies once for the whole batch.
   */
  const commit = (nextQuery: RuleGroupTypeAny): void => {
    query.value = nextQuery;
    getProps().onQueryChange?.(nextQuery as never);
    options.writeBack?.(nextQuery);
  };

  const unsubscribe = manager.subscribe(() => {
    commit(manager.getQuery());
  });
  onScopeDispose(unsubscribe, true);

  if (config.value.enableMountQueryChange) {
    const notifyMount = (): void => {
      getProps().onQueryChange?.(query.value as never);
      options.writeBack?.(query.value);
    };
    // Matches React's mount effect when there is a component to mount; outside a component (as
    // in a unit test) there is no mount, so fire immediately.
    if (getCurrentInstance()) {
      onMounted(notifyMount);
    } else {
      notifyMount();
    }
  }

  // Controlled mode: a new `query` prop is pushed into the manager. The two-stage guard is what
  // prevents a feedback loop with the subscription above. Reference equality alone is not
  // enough: a parent that stores the query in `reactive`/`ref` hands back a proxy of the very
  // object just emitted, which is never `Object.is`-equal to it.
  watch(
    () => getProps().query,
    nextQuery => {
      if (!nextQuery) return;
      const raw = toRaw(nextQuery);
      if (Object.is(raw, manager.getQuery())) return;
      if (manager.signatureOf(raw) === unchangedSignature) return;
      manager.setQuery(raw);
    }
  );
  // #endregion

  const actions = useQueryActions<F, O>(getProps, manager);

  // #region Derived config
  const independentCombinators = computed(() => isRuleGroupTypeIC(query.value));
  const disabledPaths = computed(() =>
    Array.isArray(getProps().disabled) ? (getProps().disabled as Path[]) : emptyDisabledPaths
  );
  const queryDisabled = computed(() => getProps().disabled === true);
  const rootGroupDisabled = computed(
    () => !!query.value.disabled || disabledPaths.value.some(p => p.length === 0)
  );

  const validationResult = computed(() => {
    const { validator } = getProps();
    return typeof validator === 'function' ? validator(query.value) : emptyValidationMap;
  });
  const validationMap = computed(() =>
    typeof validationResult.value === 'boolean' ? emptyValidationMap : validationResult.value
  );

  // A disabled root *group* does not disable the wrapper, so this reads `queryDisabled` rather
  // than `rootGroupDisabled`.
  const wrapperClassName = computed(() =>
    deriveQueryBuilderClassNames({
      classNames: config.value.classNames,
      suppressStandardClassnames: config.value.suppressStandardClassnames,
      disabled: queryDisabled.value,
      validationResult: validationResult.value,
    })
  );

  const inlineCombinatorsAttr = computed(() =>
    independentCombinators.value || config.value.showCombinatorsBetweenRules
      ? 'enabled'
      : 'disabled'
  );
  // #endregion

  const schema = computed<Schema<F, OName>>(() => ({
    manager,
    fields,
    fieldMap: fieldMap as Schema<F, OName>['fieldMap'],
    classNames: config.value.classNames,
    combinators,
    controls: config.value.controls,
    getParameters,
    createRule: () => manager.createRule(),
    createRuleGroup: (ic?: boolean) => manager.createRuleGroup(ic ?? independentCombinators.value),
    getQuery: manager.getQuery,
    getOperators: getOperators as Schema<F, OName>['getOperators'],
    getValueEditorType,
    getValueEditorSeparator: (field, operator, misc) =>
      (getProps().getValueEditorSeparator ?? defaultGetValueEditorSeparator)(
        field as FName,
        operator as OName,
        misc
      ),
    getValueSources: (field, operator) => getValueSources(field, operator),
    getInputType,
    getValues,
    getRuleDefaultValue: getRuleDefaultValueMain,
    getRuleDefaultOperator,
    getMatchModes: (field: string) => getMatchModes(field),
    getSubQueryBuilderProps,
    getRuleClassname: (rule, misc) =>
      (getProps().getRuleClassname ?? defaultGetRuleOrGroupClassname)(rule as never, misc),
    getRuleGroupClassname: ruleGroup =>
      (getProps().getRuleGroupClassname ?? defaultGetRuleOrGroupClassname)(ruleGroup as never),
    accessibleDescriptionGenerator:
      getProps().accessibleDescriptionGenerator ?? generateAccessibleDescription,
    showCombinatorsBetweenRules: config.value.showCombinatorsBetweenRules,
    showNotToggle: config.value.showNotToggle,
    showShiftActions: config.value.showShiftActions,
    showUndoRedo: config.value.showUndoRedo,
    showCloneButtons: config.value.showCloneButtons,
    showLockButtons: config.value.showLockButtons,
    showMuteButtons: config.value.showMuteButtons,
    autoSelectField: config.value.autoSelectField,
    autoSelectOperator: config.value.autoSelectOperator,
    autoSelectValue: config.value.autoSelectValue,
    addRuleToNewGroups: config.value.addRuleToNewGroups,
    enableDragAndDrop: config.value.enableDragAndDrop,
    validationMap: validationMap.value,
    independentCombinators: independentCombinators.value,
    listsAsArrays: config.value.listsAsArrays,
    parseNumbers: getProps().parseNumbers ?? false,
    disabledPaths: disabledPaths.value,
    suppressStandardClassnames: config.value.suppressStandardClassnames,
    maxLevels,
    resetOnFieldChange: config.value.resetOnFieldChange,
    resetOnOperatorChange: config.value.resetOnOperatorChange,
  }));

  const context = computed<QueryBuilderContextProps<F, OName>>(() => ({
    controlElements: config.value.controls,
    controlClassnames: config.value.classNames,
    translations: config.value.translations,
    debugMode: config.value.debugMode,
    enableMountQueryChange: config.value.enableMountQueryChange,
    showCombinatorsBetweenRules: config.value.showCombinatorsBetweenRules,
    showNotToggle: config.value.showNotToggle,
    showShiftActions: config.value.showShiftActions,
    showUndoRedo: config.value.showUndoRedo,
    showCloneButtons: config.value.showCloneButtons,
    showLockButtons: config.value.showLockButtons,
    showMuteButtons: config.value.showMuteButtons,
    resetOnFieldChange: config.value.resetOnFieldChange,
    resetOnOperatorChange: config.value.resetOnOperatorChange,
    autoSelectField: config.value.autoSelectField,
    autoSelectOperator: config.value.autoSelectOperator,
    autoSelectValue: config.value.autoSelectValue,
    addRuleToNewGroups: config.value.addRuleToNewGroups,
    listsAsArrays: config.value.listsAsArrays,
    suppressStandardClassnames: config.value.suppressStandardClassnames,
  }));

  return {
    query,
    rootGroup: query,
    manager,
    schema,
    actions,
    translations: computed(() => config.value.translations),
    controls: computed(() => config.value.controls),
    classNames: computed(() => config.value.classNames),
    wrapperClassName,
    // Drag-and-drop is a non-goal, but the attribute must be present for DOM parity.
    dndEnabledAttr: 'disabled',
    inlineCombinatorsAttr,
    rootGroupDisabled,
    queryDisabled,
    independentCombinators,
    context,
  };
};
