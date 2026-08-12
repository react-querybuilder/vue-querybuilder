/**
 * Loads the built ESM the way Node loads it and asserts the module graph settles.
 *
 * `defaultControlElements` sits in an import cycle: `Rule` renders `RuleSubQuery`, which needs
 * the defaults for the subquery's own query builder. A bundler and Vite's dev server evaluate
 * that graph in an order where a plain `rule: Rule` happens to work; Node's ESM order for the
 * published `dist` does not, and the failure is silent — the query builder renders every group
 * and no rules. Nothing else in CI runs the *built* artifact through a real ESM loader.
 */
import { defaultControlElements } from '../dist/index.js';

const missing = Object.entries(defaultControlElements as Record<string, unknown>)
  .filter(([, component]) => !component)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error(
    `dist/: defaultControlElements resolved to undefined for: ${missing.join(', ')}.\n` +
      'This is an import cycle evaluating in the wrong order — the affected keys must be ' +
      'accessors, not values, so they read their live binding at first access.'
  );
  process.exit(1);
}

console.log(`dist/ default control elements OK (${Object.keys(defaultControlElements).length}).`);
