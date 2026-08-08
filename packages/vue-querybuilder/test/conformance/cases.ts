/**
 * Shared plumbing for the conformance suites: fixture loading, and rendering one scenario × query
 * pair the way `utils/conformance/generate.tsx` rendered it upstream.
 */

import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { render } from '@testing-library/vue';
import { nextTick } from 'vue';
import { QueryBuilder } from '../../src/components/index.js';
import type { ExtractResult } from './extract.js';
import { extract } from './extract.js';
import type { QueryFixtureName } from './queries.js';
import { queries } from './queries.js';
import type { Scenario } from './scenarios.js';
import { scenarios } from './scenarios.js';

const fixturesDir = path.resolve(import.meta.dirname, '../fixtures');

export interface FixtureMeta {
  schemaVersion: number;
  generator: { package: string; version: string; source: string; renderMode: string };
}

/**
 * Reads one fixture file, with an actionable message when it is missing — the files are
 * gitignored and fetched on demand, so "not found" is the expected first-run failure.
 *
 * `node:fs` rather than `Bun.file`: Vitest runs these tests under Node, not Bun, where the
 * `Bun` global does not exist.
 */
export const loadFixture = async <T>(name: string): Promise<T & FixtureMeta> => {
  const file = path.join(fixturesDir, name);
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    throw new Error(
      `Conformance fixture ${name} could not be read. Run \`bun run conformance:fetch\` (or ` +
        `\`bun run conformance\`, which fetches first).`
    );
  }
};

/** One scenario × query pair, in the order `generate.tsx` flattened them. */
export interface RenderPair {
  scenario: Scenario;
  queryName: string;
  query: unknown;
}

/**
 * Flattens scenarios into render pairs. The order must match `generate.tsx` exactly, since the
 * fixture `cases` array is positional as well as keyed.
 */
export const renderPairs: RenderPair[] = scenarios.flatMap(scenario => {
  const cases: [string, unknown][] = scenario.query
    ? [['inline', scenario.query]]
    : (scenario.queries ?? []).map(name => [name, queries[name as QueryFixtureName]]);

  return cases.map(([queryName, query]) => ({ scenario, queryName, query }));
});

/**
 * Renders a pair and extracts its class surface and accessible descriptions.
 *
 * The props mirror `generate.tsx`: controlled `query`, no-op `onQueryChange`. Nothing here
 * awaits `nextTick()`, because the fixtures come from `renderToStaticMarkup` — see the note in
 * `classnames.test.ts`.
 */
export const renderAndExtract = ({
  scenario,
  query,
}: RenderPair): ExtractResult & { container: Element } => {
  // Scenario props are deliberately untyped (see `scenarios.ts`), so the cast is where that
  // looseness is contained rather than something the component API is missing.
  const props = { ...scenario.props, query, onQueryChange: () => {} } as Record<string, unknown>;
  const { container } = render(QueryBuilder, { props });

  return { container, ...extract(container) };
};

/**
 * Awaits ticks until the extracted surface stops changing, or throws.
 *
 * Bounded, not a fixed tick count: a reset write triggers a re-render that may schedule further
 * effects, and the right number of ticks depends on `flush: 'post'` ordering plus the
 * `nextTick`-deferred mount run in `useValueEditorReset.ts`. A surface that never settles is an
 * effect loop and must fail loudly rather than be papered over by a bigger constant.
 */
const drain = async (container: Element, max = 10): Promise<void> => {
  let previous = JSON.stringify(extract(container));
  for (let i = 0; i < max; i++) {
    await nextTick();
    const current = JSON.stringify(extract(container));
    if (current === previous) return;
    previous = current;
  }
  throw new Error(`Surface did not stabilize within ${max} ticks — probable effect loop.`);
};

/**
 * Renders a pair the way the post-flush fixture layer was generated: **uncontrolled**
 * (`defaultQuery`, no `onQueryChange` / `update:query` handler) so effect-driven query changes
 * land instead of being reverted by the controlled-prop sync, then drained to stability.
 */
export const renderAndExtractPostFlush = async ({
  scenario,
  query,
}: RenderPair): Promise<ExtractResult & { container: Element }> => {
  const props = { ...scenario.props, defaultQuery: query } as Record<string, unknown>;
  const { container } = render(QueryBuilder, { props });
  await drain(container);

  return { container, ...extract(container) };
};
