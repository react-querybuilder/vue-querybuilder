import type { FullField } from '@react-querybuilder/core';
import { nullComponent } from '../composables/context.js';
import type { Controls } from '../types/controls.js';
import ActionElement from './ActionElement.vue';
import Rule from './Rule.vue';
import RuleGroup from './RuleGroup.vue';
import ValueEditor from './ValueEditor.vue';
import ValueSelector from './ValueSelector.vue';

/**
 * The default component for every control.
 *
 * `mergeControlElements` leaves a key unset when neither the props, the inherited context, nor
 * the defaults supply a component, so every one of the 24 keys must have an entry here. The
 * controls that milestone A does not implement yet map to `nullComponent`; step 5 replaces
 * those entries with real components.
 */
export const defaultControlElements: Controls<FullField, string> = {
  actionElement: ActionElement,
  addGroupAction: ActionElement,
  addRuleAction: ActionElement,
  cloneGroupAction: ActionElement,
  cloneRuleAction: ActionElement,
  combinatorSelector: ValueSelector,
  fieldSelector: ValueSelector,
  lockGroupAction: ActionElement,
  lockRuleAction: ActionElement,
  muteGroupAction: ActionElement,
  muteRuleAction: ActionElement,
  operatorSelector: ValueSelector,
  removeGroupAction: ActionElement,
  removeRuleAction: ActionElement,
  rule: Rule,
  ruleGroup: RuleGroup,
  valueEditor: ValueEditor,
  valueSelector: ValueSelector,
  valueSourceSelector: ValueSelector,
  // Step 5 (milestone B).
  inlineCombinator: nullComponent,
  matchModeEditor: nullComponent,
  notToggle: nullComponent,
  shiftActions: nullComponent,
  undoRedoActions: nullComponent,
} as Controls<FullField, string>;
