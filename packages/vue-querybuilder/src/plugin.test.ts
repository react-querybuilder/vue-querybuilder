import { describe, expect, it } from 'vitest';
import { createApp, h } from 'vue';
import { mountWithPlugin } from '../test/support.js';
import {
  defaultComponentPrefix,
  queryBuilderComponentNames,
  queryBuilderComponents,
  QueryBuilderPlugin,
  resolveComponentName,
} from './plugin.js';
import { QueryBuilderResolver } from './resolver.js';

describe('QueryBuilderPlugin', () => {
  it('registers every component under the default `Qb` prefix', () => {
    const app = createApp({ render: () => h('div') });
    app.use(QueryBuilderPlugin);
    for (const name of queryBuilderComponentNames) {
      expect(app.component(`Qb${name}`)).toBe(queryBuilderComponents[name]);
    }
  });

  it('does not register the bare names by default', () => {
    const app = createApp({ render: () => h('div') });
    app.use(QueryBuilderPlugin);
    expect(app.component('QueryBuilder')).toBeUndefined();
  });

  it('registers under a custom prefix', () => {
    const app = createApp({ render: () => h('div') });
    app.use(QueryBuilderPlugin, { prefix: 'X' });
    expect(app.component('XQueryBuilder')).toBe(queryBuilderComponents.QueryBuilder);
    expect(app.component('QbQueryBuilder')).toBeUndefined();
  });

  it('registers under bare names when the prefix is empty', () => {
    const app = createApp({ render: () => h('div') });
    app.use(QueryBuilderPlugin, { prefix: '' });
    expect(app.component('QueryBuilder')).toBe(queryBuilderComponents.QueryBuilder);
  });

  it('renders a globally registered `QbQueryBuilder`', () => {
    const { getByTestId } = mountWithPlugin('<QbQueryBuilder />');
    expect(getByTestId('rule-group')).toBeInTheDocument();
  });

  it('renders a globally registered control on its own', () => {
    const { getByTestId } = mountWithPlugin(
      '<QbActionElement testID="add-rule" label="+" :handleOnClick="() => {}" />'
    );
    expect(getByTestId('add-rule')).toHaveTextContent('+');
  });

  it('omits the internal composition components', () => {
    expect(queryBuilderComponentNames).not.toContain('RuleComponents');
    expect(queryBuilderComponentNames).not.toContain('RuleGroupHeader');
    expect(queryBuilderComponentNames).not.toContain('RuleGroupBody');
    expect(queryBuilderComponentNames).not.toContain('RuleSubQuery');
  });
});

describe('resolveComponentName', () => {
  it('strips the prefix from a known component', () => {
    expect(resolveComponentName('QbValueEditor')).toBe('ValueEditor');
  });

  it('rejects an unprefixed name', () => {
    expect(resolveComponentName('ValueEditor')).toBeUndefined();
  });

  it('rejects an unknown component', () => {
    expect(resolveComponentName('QbSomethingElse')).toBeUndefined();
  });

  it('honors a custom prefix', () => {
    expect(resolveComponentName('XRule', 'X')).toBe('Rule');
    expect(resolveComponentName('QbRule', 'X')).toBeUndefined();
  });

  it('does not resolve inherited Object properties', () => {
    expect(resolveComponentName(`${defaultComponentPrefix}toString`)).toBeUndefined();
  });
});

describe('QueryBuilderResolver', () => {
  it('resolves a prefixed name to a named export of the package', () => {
    expect(QueryBuilderResolver().resolve('QbQueryBuilder')).toEqual({
      name: 'QueryBuilder',
      from: '@react-querybuilder/vue',
    });
  });

  it('declares itself a component resolver', () => {
    expect(QueryBuilderResolver().type).toBe('component');
  });

  it('returns undefined for anything else', () => {
    expect(QueryBuilderResolver().resolve('SomeOtherComponent')).toBeUndefined();
  });

  it('honors a custom prefix', () => {
    expect(QueryBuilderResolver({ prefix: 'X' }).resolve('XRuleGroup')).toEqual({
      name: 'RuleGroup',
      from: '@react-querybuilder/vue',
    });
  });
});
