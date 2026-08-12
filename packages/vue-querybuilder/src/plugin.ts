import type { App, Component, Plugin } from 'vue';
import ActionElement from './components/ActionElement.vue';
import InlineCombinator from './components/InlineCombinator.vue';
import MatchModeEditor from './components/MatchModeEditor.vue';
import NotToggle from './components/NotToggle.vue';
import QueryBuilder from './components/QueryBuilder.vue';
import Rule from './components/Rule.vue';
import RuleGroup from './components/RuleGroup.vue';
import ShiftActions from './components/ShiftActions.vue';
import UndoRedoActions from './components/UndoRedoActions.vue';
import ValueEditor from './components/ValueEditor.vue';
import ValueSelector from './components/ValueSelector.vue';

/**
 * Every component the plugin registers, keyed by its unprefixed name: `QueryBuilder` plus the
 * ten default control elements, which are the components a consumer can meaningfully place in a
 * template or pass to `controlElements`.
 *
 * The internal composition pieces (`RuleComponents`, `RuleGroupHeader`, `RuleGroupBody`,
 * `RuleSubQuery`) are deliberately absent: they read everything they render from through
 * injection and cannot be mounted on their own.
 */
export const queryBuilderComponents = {
  QueryBuilder,
  ActionElement,
  InlineCombinator,
  MatchModeEditor,
  NotToggle,
  Rule,
  RuleGroup,
  ShiftActions,
  UndoRedoActions,
  ValueEditor,
  ValueSelector,
  // oxlint-disable-next-line typescript/no-explicit-any
} as unknown as Record<string, Component<any>>;

/** The unprefixed names of the components {@link QueryBuilderPlugin} registers. */
export const queryBuilderComponentNames: readonly string[] = Object.keys(queryBuilderComponents);

/** Options for {@link QueryBuilderPlugin}. */
export interface QueryBuilderPluginOptions {
  /**
   * Prepended to every registered component name, so that `QueryBuilder` registers as
   * `QbQueryBuilder` and `ValueEditor` as `QbValueEditor`.
   *
   * Defaults to `'Qb'`, which keeps generic names like `Rule` and `ValueEditor` out of the
   * global registry. Pass `''` to register the components under their bare names.
   *
   * @default 'Qb'
   */
  prefix?: string;
}

/** The default {@link QueryBuilderPluginOptions.prefix}. */
export const defaultComponentPrefix = 'Qb';

/**
 * The prefixed global name of a component, or `undefined` if `name` is not one of this package's.
 *
 * Shared by the plugin and the `unplugin-vue-components` resolver so the two cannot disagree.
 */
export const resolveComponentName = (
  name: string,
  prefix: string = defaultComponentPrefix
): string | undefined =>
  name.startsWith(prefix) && Object.hasOwn(queryBuilderComponents, name.slice(prefix.length))
    ? name.slice(prefix.length)
    : undefined;

/**
 * Registers this package's components globally.
 *
 * ```ts
 * import { createApp } from 'vue';
 * import { QueryBuilderPlugin } from '@react-querybuilder/vue';
 * import '@react-querybuilder/vue/dist/query-builder.css';
 *
 * createApp(App).use(QueryBuilderPlugin).mount('#app');
 * ```
 *
 * Entirely optional — the named exports work without it, and are the better choice in an
 * application that prefers explicit imports. Nothing about the plugin affects rendering; it only
 * populates `app.component`.
 */
export const QueryBuilderPlugin: Plugin<[QueryBuilderPluginOptions?]> = {
  install(app: App, options: QueryBuilderPluginOptions = {}): void {
    const prefix = options.prefix ?? defaultComponentPrefix;
    for (const [name, component] of Object.entries(queryBuilderComponents)) {
      app.component(`${prefix}${name}`, component);
    }
  },
};

declare module 'vue' {
  /**
   * Types the globally registered components for a template that uses {@link QueryBuilderPlugin}
   * with the default prefix.
   *
   * Declared unconditionally, so `<QbQueryBuilder />` typechecks in any project that depends on
   * this package. A custom `prefix` needs its own augmentation.
   */
  export interface GlobalComponents {
    QbQueryBuilder: typeof QueryBuilder;
    QbActionElement: typeof ActionElement;
    QbInlineCombinator: typeof InlineCombinator;
    QbMatchModeEditor: typeof MatchModeEditor;
    QbNotToggle: typeof NotToggle;
    QbRule: typeof Rule;
    QbRuleGroup: typeof RuleGroup;
    QbShiftActions: typeof ShiftActions;
    QbUndoRedoActions: typeof UndoRedoActions;
    QbValueEditor: typeof ValueEditor;
    QbValueSelector: typeof ValueSelector;
  }
}
