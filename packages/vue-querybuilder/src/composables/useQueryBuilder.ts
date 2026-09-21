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
 * Structural equality for manager option values, used to decide whether a prop change is worth a
 * `reconfigure`. Arrays and plain objects are compared by value; everything else — functions
 * included — by identity, which is what makes a config object rebuilt on every render compare
 * equal as long as its data did not change.
 *
 * This is load-bearing, not an optimization: any caller that rebuilds its props object per render
 * (the conformance harness does, and so does every consumer passing object literals) hands the
 * watcher a fresh identity for every structural read, so an identity-only gate would make the
 * effect self-perpetuating.
 */
const valuesEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => valuesEqual(v, b[i]))
    );
  }
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null ||
    Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)
  ) {
    return false;
  }
  const aKeys = Object.keys(a);
  return (
    aKeys.length === Object.keys(b).length &&
    aKeys.every(k =>
      valuesEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    )
  );
};

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
 * applied in place with `QueryManager#reconfigure` whenever the corresponding props change, so
 * the query, the undo/redo history, and every subscriber survive a config change. Function props
 * (`getOperators`, `getDefaultValue`, etc.) are forwarded through closures, so those stay live
 * without any reconfiguration at all. An externally supplied `manager` prop is never
 * reconfigured.
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

  /*
   * Phases, in document order. They are delimited by `#region` banners below but deliberately
   * not extracted: the `live()` closures, the schema bag, and the controlled write-back guard
   * all close over the same manager *and* the same merged config, so any split either returns a
   * ~15-member bag or re-derives the merged config a second time.
   *
   *   1. Manager lifecycle — option assembly, construction or adoption, initial query seeding.
   *   2. Resolver derivation — option lists read back off the manager, plus the resolvers the
   *      schema exposes.
   *   3. Query state and controlled write-back — the `shallowRef`, the manager subscription, the
   *      mount notification, and the `query`-prop guard.
   *   4. Reconfigure watcher and equality gate — structural options re-applied in place.
   *   5. Derived config and schema assembly — everything the components actually read.
   */

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

  // #region Phase 1 — Manager lifecycle
  const initialProps = getProps();

  const maxLevels = computed(() =>
    (getProps().maxLevels ?? 0) > 0 ? Number(getProps().maxLevels) : Infinity
  );
  const disabledPaths = computed(() =>
    Array.isArray(getProps().disabled) ? (getProps().disabled as Path[]) : emptyDisabledPaths
  );

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

  /**
   * Builds the full option set for the manager. Used both for construction and for every
   * `reconfigure` call, so the two cannot drift — the same discipline the manager's own
   * `#applyOptions` enforces upstream.
   *
   * `toRaw` throughout: the manager deep-freezes what it is given, which throws on a Vue
   * reactive proxy.
   */
  const buildManagerOptions = (): QueryManagerOptions<F, O, FullCombinator> => {
    const p = getProps();
    const c = config.value;
    return {
      fields: toRaw(p.fields),
      operators: toRaw(p.operators),
      combinators: toRaw(p.combinators),
      baseField: toRaw(p.baseField),
      baseOperator: toRaw(p.baseOperator),
      baseCombinator: toRaw(p.baseCombinator),
      autoSelectField: c.autoSelectField,
      autoSelectOperator: c.autoSelectOperator,
      autoSelectValue: c.autoSelectValue,
      // The manager prepares every option list, including the placeholder options, so it needs
      // the merged translations. Everything rendered here reads those lists back off the
      // manager; `prepareOptionList` is deliberately not reimplemented locally.
      translations: toRaw(c.translations),
      addRuleToNewGroups: c.addRuleToNewGroups,
      listsAsArrays: c.listsAsArrays,
      resetOnFieldChange: c.resetOnFieldChange,
      resetOnOperatorChange: c.resetOnOperatorChange,
      maxLevels: maxLevels.value,
      disabledPaths: toRaw(disabledPaths.value),
      queryDisabled: p.disabled === true,
      history: true,
      validator: p.validator,
      idGenerator: p.idGenerator,
      // Forwarded so that changes to these props take effect without a reconfigure.
      getDefaultField: (typeof initialProps.getDefaultField === 'function'
        ? live(pp => pp.getDefaultField)
        : p.getDefaultField) as never,
      getDefaultOperator: (typeof initialProps.getDefaultOperator === 'function'
        ? live(pp => pp.getDefaultOperator)
        : p.getDefaultOperator) as never,
      getDefaultValue: live(pp => pp.getDefaultValue) as never,
      getOperators: live(pp => pp.getOperators) as never,
      getValueEditorType: live(pp => pp.getValueEditorType) as never,
      getValues: live(pp => pp.getValues) as never,
      getValueSources: live(pp => pp.getValueSources) as never,
      getMatchModes: live(pp => pp.getMatchModes) as never,
      getParameters: live(pp => pp.getParameters) as never,
      getInputType: live(pp => pp.getInputType) as never,
      getSubQueryBuilderProps: live(pp => pp.getSubQueryBuilderProps) as never,
    };
  };

  /**
   * The subset of the manager's options that cannot be forwarded through a closure, and so has to
   * be re-applied with `reconfigure` when it changes. Doubles as the reconfigure watcher's
   * dependency set. Function props are deliberately excluded — they reach the manager through
   * `live()` closures and stay current on their own, and comparing them would defeat the
   * equality gate for anyone passing inline arrows.
   */
  const structuralOptions = () => {
    const p = getProps();
    const c = config.value;
    return {
      fields: p.fields,
      operators: p.operators,
      combinators: p.combinators,
      baseField: p.baseField,
      baseOperator: p.baseOperator,
      baseCombinator: p.baseCombinator,
      autoSelectField: c.autoSelectField,
      autoSelectOperator: c.autoSelectOperator,
      autoSelectValue: c.autoSelectValue,
      translations: c.translations,
      addRuleToNewGroups: c.addRuleToNewGroups,
      listsAsArrays: c.listsAsArrays,
      resetOnFieldChange: c.resetOnFieldChange,
      resetOnOperatorChange: c.resetOnOperatorChange,
      maxLevels: maxLevels.value,
      disabledPaths: disabledPaths.value,
      queryDisabled: p.disabled === true,
    };
  };

  // No `toRaw` on the manager: as of `@react-querybuilder/core` 8.23.0 its state lives in a
  // non-enumerable symbol-keyed own property, which reads correctly through a reactive `Proxy`,
  // and that property is flagged `__v_skip` so `reactive()` will not deep-proxy it either.
  const manager =
    (initialProps.manager as QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>) ??
    new QueryManager<RuleGroupTypeAny, F, O, FullCombinator>(undefined, buildManagerOptions());

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

  // #region Phase 2 — Resolver derivation: option lists
  // Read off the manager, which prepares them from the same options — including `translations`,
  // which supplies the placeholder options when `autoSelect*` is `false`. Keyed on
  // `configVersion` so that a reconfigure (see below) refreshes them.
  const configVersion = shallowRef(manager.getConfigVersion());

  const fields = computed(() => {
    void configVersion.value;
    return manager.getFields();
  });
  const combinators = computed(() => {
    void configVersion.value;
    return manager.getCombinators();
  });
  const fieldMap = computed(
    () =>
      Object.fromEntries(
        toFlatOptionArray(fields.value as FullOptionList<FullOption>).map(f => [
          f.value ?? f.name,
          f,
        ])
      ) as Partial<FullOptionRecord<F>>
  );
  // #endregion

  // #region Phase 2 — Resolver derivation: resolvers
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
      fields: fields.value,
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

  // #region Phase 3 — Query state and controlled write-back
  // `shallowRef`, not `ref`: queries are immutable and are replaced wholesale, and a deep proxy
  // would both defeat the reference comparisons this design rests on and be rejected by the
  // manager's Immer deep-freeze.
  const query = shallowRef<RuleGroupTypeAny>(manager.getQuery());

  // A non-reactive mirror of `query`. The subscription callback runs synchronously inside
  // whichever effect triggered the mutation, so reading the reactive `query` there would make
  // that effect depend on the state it just caused to change.
  let committed = manager.getQuery();

  /**
   * Publishes a committed query. Called from the manager subscription rather than from a
   * separate watcher, so it fires exactly once per commit — including inside `manager.batch()`,
   * which notifies once for the whole batch.
   */
  const commit = (nextQuery: RuleGroupTypeAny): void => {
    query.value = nextQuery;
    committed = nextQuery;
    getProps().onQueryChange?.(nextQuery as never);
    options.writeBack?.(nextQuery);
  };

  const unsubscribe = manager.subscribe(() => {
    // A reconfigure notifies without touching the query. Refresh the config version
    // unconditionally, but only commit — and therefore only fire `onQueryChange`/`writeBack` —
    // when the query actually changed.
    configVersion.value = manager.getConfigVersion();
    const nextQuery = manager.getQuery();
    if (!Object.is(nextQuery, committed)) {
      commit(nextQuery);
    }
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

  // #region Phase 4 — Reconfigure watcher and equality gate
  // Structural options are applied in place, so the query, the undo/redo history, and every
  // subscriber survive a config change. Skipped entirely for an externally supplied manager:
  // that one belongs to the consumer.
  //
  // The watcher is not `immediate` — the constructor already applied these options, and an
  // immediate run would bump `configVersion` and notify before first render, which is a
  // DOM-parity hazard.
  if (!initialProps.manager) {
    let appliedSignature = structuralOptions();

    watch(
      // Reading the signature is what registers the dependencies: the structural props plus the
      // parts of `config` the manager consumes. The getter returns a fresh object every run, so
      // Vue's own identity check never suppresses the callback; `valuesEqual` does that job.
      structuralOptions,
      next => {
        if (valuesEqual(next, appliedSignature)) return;
        appliedSignature = next;
        manager.reconfigure(buildManagerOptions());
      },
      { flush: 'post' }
    );
  }
  // #endregion

  const actions = useQueryActions<F, O>(getProps, manager);

  // #region Phase 5 — Derived config and schema assembly
  const independentCombinators = computed(() => isRuleGroupTypeIC(query.value));
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
    fields: fields.value,
    fieldMap: fieldMap.value as Schema<F, OName>['fieldMap'],
    classNames: config.value.classNames,
    combinators: combinators.value,
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
    showUngroupButtons: config.value.showUngroupButtons,
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
    maxLevels: maxLevels.value,
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
    showUngroupButtons: config.value.showUngroupButtons,
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
