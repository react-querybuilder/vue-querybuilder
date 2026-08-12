import type { FullField } from '@react-querybuilder/core';
import type { Controls } from '../types/controls.js';
import ActionElement from './ActionElement.vue';
import InlineCombinator from './InlineCombinator.vue';
import MatchModeEditor from './MatchModeEditor.vue';
import NotToggle from './NotToggle.vue';
import Rule from './Rule.vue';
import RuleGroup from './RuleGroup.vue';
import ShiftActions from './ShiftActions.vue';
import UndoRedoActions from './UndoRedoActions.vue';
import ValueEditor from './ValueEditor.vue';
import ValueSelector from './ValueSelector.vue';

/**
 * The default component for every control.
 *
 * `mergeControlElements` leaves a key unset when neither the props, the inherited context, nor
 * the defaults supply a component, so every one of the 24 keys must have an entry here. Every
 * key resolves to a real component; none maps to `nullComponent`.
 *
 * `rule` and `ruleGroup` are **accessors, not values**. This module sits in an import cycle —
 * `Rule` renders `RuleSubQuery`, which needs these defaults for the subquery's own query builder
 * — and in the emitted ESM this module is evaluated before `Rule.js` finishes, so a plain
 * `rule: Rule` captures the temporal-dead-zone `undefined` and the query builder silently renders
 * no rules at all. An accessor reads the live binding at first access, which is during `setup`,
 * long after every module has evaluated. `dist-cycles.test.ts` guards it.
 */
export const defaultControlElements = {
  actionElement: ActionElement,
  addGroupAction: ActionElement,
  addRuleAction: ActionElement,
  cloneGroupAction: ActionElement,
  cloneRuleAction: ActionElement,
  combinatorSelector: ValueSelector,
  fieldSelector: ValueSelector,
  inlineCombinator: InlineCombinator,
  lockGroupAction: ActionElement,
  lockRuleAction: ActionElement,
  matchModeEditor: MatchModeEditor,
  muteGroupAction: ActionElement,
  muteRuleAction: ActionElement,
  notToggle: NotToggle,
  operatorSelector: ValueSelector,
  removeGroupAction: ActionElement,
  removeRuleAction: ActionElement,
  get rule() {
    return Rule;
  },
  get ruleGroup() {
    return RuleGroup;
  },
  shiftActions: ShiftActions,
  undoRedoActions: UndoRedoActions,
  valueEditor: ValueEditor,
  valueSelector: ValueSelector,
  valueSourceSelector: ValueSelector,
  // `Rule` and `RuleGroup` are generic components, whose emitted type is a generic function
  // rather than a plain `Component<P>`; a direct assignment is not comparable in either
  // direction, so the assertion goes through `unknown`.
} as unknown as Controls<FullField, string>;
