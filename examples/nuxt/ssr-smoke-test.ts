/**
 * SSR smoke test.
 *
 * Builds the Nuxt example (which consumes the *published artifact*: `@react-querybuilder/vue` is a
 * workspace dependency, so this exercises the package `exports` map, its condition order, and
 * the emitted declarations — not the source tree), then serves `.output` on an **ephemeral
 * port** through Nitro's exported Node listener.
 *
 * The server is never started by spawning a CLI. `nuxt preview` can leave an orphan process
 * holding the port and serving a stale build, which silently poisons the next run.
 *
 * Exit code is the gate: 0 = pass, 1 = fail.
 */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';

const root = import.meta.dirname;
const serverEntry = resolve(root, '.output/server/index.mjs');

const expectedSql =
  "(firstName like 'Stev%' and lastName in ('Vai', 'Vaughan') or (age > '28' and age < '52'))";

/** Vue's SSR escapes text content, so the assertion has to match the escaped form. */
const escapeHtml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

/**
 * SSR frameworks render an error *page* rather than returning a 500, so a DOM-API reference
 * error can arrive as a 200. Grep for it explicitly.
 */
const errorNeedles = [
  'document is not defined',
  'window is not defined',
  'navigator is not defined',
  'localStorage is not defined',
  'ReferenceError',
];

/** Every assertion is a substring that must appear in the server-rendered HTML. */
const assertions: [name: string, needle: string][] = [
  ['root wrapper class', 'class="queryBuilder"'],
  ['root role', 'role="form"'],
  ['drag-and-drop attribute', 'data-dnd="disabled"'],
  ['inline-combinators attribute', 'data-inlinecombinators="enabled"'],
  ['root group path', 'data-path="[]"'],
  ['first rule path', 'data-path="[0]"'],
  ['second rule path', 'data-path="[2]"'],
  ['nested group path', 'data-path="[4]"'],
  ['nested group first rule path', 'data-path="[4,0]"'],
  ['rule-group testID', 'data-testid="rule-group"'],
  ['rule testID', 'data-testid="rule"'],
  ['inline-combinator testID', 'data-testid="inline-combinator"'],
  // Rendered from a `#addRuleAction` scoped slot, so this also gates `slotToComponent`'s
  // server path.
  ['slot-rendered control label', 'Custom Add Rule'],
  ['server-side formatQuery output', escapeHtml(expectedSql)],
];

const build = async () => {
  const proc = Bun.spawn(['bunx', 'nuxt', 'build'], {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`\nssr-smoke-test: \`nuxt build\` failed with exit code ${code}.`);
    process.exit(1);
  }
};

const fetchRenderedPage = async () => {
  const { listener } = (await import(serverEntry)) as {
    listener: Parameters<typeof createServer>[1];
  };

  const server = createServer(listener);
  await new Promise<void>(res => server.listen(0, '127.0.0.1', res));
  const { port } = server.address() as AddressInfo;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    return { status: response.status, html: await response.text() };
  } finally {
    await new Promise<void>(res => server.close(() => res()));
  }
};

await build();

const { status, html } = await fetchRenderedPage();

const failures: string[] = [];

if (status !== 200) failures.push(`expected HTTP 200, got ${status}`);

for (const needle of errorNeedles) {
  if (html.includes(needle)) failures.push(`server-rendered HTML contains "${needle}"`);
}

for (const [name, needle] of assertions) {
  if (!html.includes(needle)) failures.push(`${name}: expected HTML to contain ${needle}`);
}

if (failures.length > 0) {
  console.error(`\nssr-smoke-test: ${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  console.error(`\n--- first 4000 chars of the response ---\n${html.slice(0, 4000)}`);
  process.exit(1);
}

console.log(
  `ssr-smoke-test: ${assertions.length} assertions passed, no SSR errors in the rendered HTML.`
);
process.exit(0);
