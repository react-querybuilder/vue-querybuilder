import { defaultComponentPrefix, resolveComponentName } from './plugin.js';

/**
 * A component resolver for
 * [`unplugin-vue-components`](https://github.com/unplugin/unplugin-vue-components), so that
 * `<QbQueryBuilder />` in a template needs no import.
 *
 * ```ts
 * // vite.config.ts
 * import Components from 'unplugin-vue-components/vite';
 * import { QueryBuilderResolver } from '@react-querybuilder/vue/resolver';
 *
 * export default defineConfig({
 *   plugins: [vue(), Components({ resolvers: [QueryBuilderResolver()] })],
 * });
 * ```
 *
 * The stylesheet is not auto-imported: this package ships several, and which one a consumer
 * wants is not inferable. Import it once, by hand.
 */

/** The shape `unplugin-vue-components` expects a resolver to return. */
export interface QueryBuilderComponentResolved {
  name: string;
  from: string;
}

/** Options for {@link QueryBuilderResolver}. */
export interface QueryBuilderResolverOptions {
  /**
   * The prefix used in templates. Must match the plugin's.
   *
   * @default 'Qb'
   */
  prefix?: string;
}

/** @see {@link QueryBuilderResolver} */
export interface QueryBuilderComponentResolver {
  type: 'component';
  resolve: (name: string) => QueryBuilderComponentResolved | undefined;
}

/**
 * Builds the resolver. See the module documentation for usage.
 */
export const QueryBuilderResolver = (
  options: QueryBuilderResolverOptions = {}
): QueryBuilderComponentResolver => {
  const prefix = options.prefix ?? defaultComponentPrefix;
  return {
    type: 'component',
    resolve: (name: string) => {
      const resolved = resolveComponentName(name, prefix);
      return resolved ? { name: resolved, from: '@react-querybuilder/vue' } : undefined;
    },
  };
};
