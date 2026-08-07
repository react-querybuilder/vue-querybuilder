import type { Field, RuleGroupTypeIC } from '@react-querybuilder/vue';

export const fields: Field[] = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
  { name: 'age', label: 'Age', inputType: 'number' },
];

/**
 * A **nested** query with **independent combinators** — the shape most likely to expose an
 * SSR-only failure, since it exercises `InlineCombinator` and recursive `RuleGroup` rendering.
 *
 * Paths asserted by `ssr-smoke-test.ts`: `[]`, `[0]`, `[2]`, `[4]`, `[4,0]`.
 */
export const query: RuleGroupTypeIC = {
  rules: [
    { field: 'firstName', operator: 'beginsWith', value: 'Stev' },
    'and',
    { field: 'lastName', operator: 'in', value: 'Vai,Vaughan' },
    'or',
    {
      rules: [
        { field: 'age', operator: '>', value: 28 },
        'and',
        { field: 'age', operator: '<', value: 52 },
      ],
    },
  ],
};
