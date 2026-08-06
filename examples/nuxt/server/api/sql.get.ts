import { formatQuery } from 'vue-querybuilder';
import { query } from '#shared/query';

/**
 * Server-side `formatQuery`. This route runs only in Nitro, so it proves the published package
 * is importable outside a browser — the package `exports` map, its condition order, and the
 * emitted declarations.
 */
export default defineEventHandler(() => ({ sql: formatQuery(query, 'sql') }));
