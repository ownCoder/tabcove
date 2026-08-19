/**
 * Tabcove — unit tests for the pure library modules.
 *
 *     node tools/test.mjs
 *
 * A minimal chrome.storage.local mock is installed on globalThis before the
 * modules are imported, so db/snapshots/trash exercise their real code paths
 * against real serialisation. No test framework: this suite has to survive for
 * years without a dependency graph rotting underneath it.
 */

import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

/* --------------------------------------------------------- chrome mock ---- */

function installChromeMock() {
  let store = {};

  globalThis.chrome = {
    runtime: {
      lastError: null,
      getURL: (p) => `chrome-extension://tabcove-test/${String(p).replace(/^\//, '')}`,
      id: 'tabcove-test',
    },
    storage: {
      local: {
        get(keys, cb) {
          let out = {};
          if (keys === null || keys === undefined) out = { ...store };
          else if (typeof keys === 'string') {
            if (keys in store) out[keys] = store[keys];
          } else if (Array.isArray(keys)) {
            for (const k of keys) if (k in store) out[k] = store[k];
          }
          // Structured-clone the result so a test mutating a returned object
          // cannot silently corrupt the "stored" copy, exactly like the real API.
          cb(JSON.parse(JSON.stringify(out)));
        },
        set(items, cb) {
          for (const [k, v] of Object.entries(items)) {
            store[k] = JSON.parse(JSON.stringify(v));
          }
          cb();
        },
        remove(keys, cb) {
          for (const k of [].concat(keys)) delete store[k];
          cb();
        },
        clear(cb) {
          store = {};
          cb();
        },
        getBytesInUse(_keys, cb) {
          cb(JSON.stringify(store).length);
        },
      },
      onChanged: { addListener() {}, removeListener() {} },
    },
  };

  return {
    reset() {
      store = {};
    },
    raw: () => store,
  };
}

const mock = installChromeMock();

/* ---------------------------------------------------------- test runner ---- */

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  mock.reset();
  try {
    await fn();
    passed++;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (error) {
    failed++;
    failures.push({ name, error });
    process.stdout.write(`  ✗ ${name}\n      ${error.message}\n`);
  }
}

function section(title) {
  process.stdout.write(`\n${title}\n`);
}

/* ------------------------------------------------------------- imports ---- */

const LIB = path.resolve(process.cwd(), 'extension/lib');
const load = (name) => import(pathToFileURL(path.join(LIB, name)).href);

const db = await load('db.js');
const snapshots = await load('snapshots.js');
const trash = await load('trash.js');
const search = await load('search.js');
const exporter = await load('exporter.js');
const importer = await load('importer.js');
const format = await load('format.js');
const settings = await load('settings.js');
const flags = await load('flags.js');
const license = await load('license.js');
const constants = await load('constants.js');

/* ------------------------------------------------------------- fixtures ---- */

function sampleCollection(overrides = {}) {
  return {
    title: 'Tax research',
    tabs: [
      { url: 'https://gov.uk/residence', title: 'Statutory residence test', groupId: 0, windowIx: 0 },
      { url: 'https://oecd.org/treaties', title: 'Double taxation treaties', groupId: 0, windowIx: 0 },
      { url: 'https://example.com/notes', title: 'My notes', groupId: -1, windowIx: 0, pinned: true },
    ],
    groups: [{ title: 'Reading', color: 'blue', collapsed: false }],
    windows: 1,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ db ---- */

section('db — collections and index');

await test('init establishes the schema and an empty index', async () => {
  const result = await db.init();
  assert.equal(result.schema, constants.SCHEMA_VERSION);
  assert.deepEqual(await db.getIndex(), []);
});

await test('createCollection writes a record and an index entry', async () => {
  await db.init();
  const created = await db.createCollection(sampleCollection());

  assert.ok(created.id, 'an id was minted');
  assert.equal(created.tabs.length, 3);

  const index = await db.getIndex();
  assert.equal(index.length, 1);
  assert.equal(index[0].count, 3);
  assert.equal(index[0].groups, 1);
  assert.equal(index[0].title, 'Tax research');

  const record = await db.getCollection(created.id);
  assert.equal(record.tabs[0].url, 'https://gov.uk/residence');
});

await test('the index stays small — it holds no tab data', async () => {
  await db.init();
  await db.createCollection(sampleCollection());
  const index = await db.getIndex();
  assert.equal(index[0].tabs, undefined, 'index entries must not carry tabs');
});

await test('sharding: each collection is its own storage key', async () => {
  await db.init();
  const a = await db.createCollection(sampleCollection({ title: 'A' }));
  const b = await db.createCollection(sampleCollection({ title: 'B' }));

  const keys = Object.keys(mock.raw());
  assert.ok(keys.includes(`tc:c:${a.id}`));
  assert.ok(keys.includes(`tc:c:${b.id}`));
  assert.notEqual(a.id, b.id);
});

await test('updateCollection bumps rev and refreshes the index', async () => {
  await db.init();
  const created = await db.createCollection(sampleCollection());
  const updated = await db.updateCollection(created.id, { title: 'Renamed' });

  assert.equal(updated.rev, 2, 'rev is monotonic — the Pro sync seam');
  assert.equal(updated.createdAt, created.createdAt, 'createdAt is preserved');

  const index = await db.getIndex();
  assert.equal(index[0].title, 'Renamed');
});

await test('excluded schemes are refused at write time', async () => {
  await db.init();
  const created = await db.createCollection({
    title: 'Mixed',
    tabs: [
      { url: 'https://ok.example', title: 'Fine' },
      { url: 'chrome://settings', title: 'Blocked' },
      { url: 'javascript:alert(1)', title: 'Hostile' },
      { url: 'not a url at all', title: 'Broken' },
      { url: 'file:///c/secret.txt', title: 'Local' },
    ],
  });
  assert.equal(created.tabs.length, 1, 'only the http(s) tab survives');
  assert.equal(created.tabs[0].url, 'https://ok.example');
});

await test('file:// is stored only when explicitly allowed', async () => {
  await db.init();
  const created = await db.createCollection(
    { title: 'Local', tabs: [{ url: 'file:///c/notes.html', title: 'Notes' }] },
    { allowFileUrls: true }
  );
  assert.equal(created.tabs.length, 1);
});

await test('prototype pollution in a payload cannot escape sanitisation', async () => {
  await db.init();
  const hostile = JSON.parse(
    '{"title":"x","__proto__":{"polluted":true},"tabs":[{"url":"https://a.example","title":"a"}]}'
  );
  const created = await db.createCollection(hostile);
  assert.equal({}.polluted, undefined, 'Object.prototype was not polluted');
  assert.equal(created.tabs.length, 1);
});

section('db — deletion, trash, and undo');

await test('deleting moves the collection to the bin, not off a cliff', async () => {
  await db.init();
  const created = await db.createCollection(sampleCollection());
  await db.deleteCollection(created.id);

  assert.deepEqual(await db.getIndex(), []);
  assert.equal(await db.getCollection(created.id), null);

  const binned = await trash.list();
  assert.equal(binned.length, 1);
  assert.equal(binned[0].collection.title, 'Tax research');
});

await test('a locked collection refuses deletion', async () => {
  await db.init();
  const created = await db.createCollection(sampleCollection({ locked: true }));
  await assert.rejects(() => db.deleteCollection(created.id), /locked/i);
  assert.equal((await db.getIndex()).length, 1);
});

await test('restoreFromTrash puts a collection back', async () => {
  await db.init();
  const created = await db.createCollection(sampleCollection());
  await db.deleteCollection(created.id);
  const restored = await db.restoreFromTrash(created.id);

  assert.equal(restored.title, 'Tax research');
  assert.equal((await db.getIndex()).length, 1);
  assert.equal((await trash.list()).length, 0);
});

await test('the bin sweep only removes items past the TTL', async () => {
  await db.init();
  await trash.put({ id: 'old', title: 'Old', tabs: [], groups: [] });

  // Age the tombstone by 40 days.
  const raw = mock.raw();
  raw['tc:trash:old'].deletedAt = Date.now() - 40 * 86400000;

  await trash.put({ id: 'new', title: 'New', tabs: [], groups: [] });

  const swept = await trash.sweep(30);
  assert.equal(swept, 1);

  const remaining = await trash.list();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].collection.id, 'new');
});

section('db — reconcile');

await test('reconcile adopts an orphan record', async () => {
  await db.init();
  const created = await db.createCollection(sampleCollection());

  // Simulate an index write that failed after the record write succeeded.
  mock.raw()['tc:index'] = [];

  const report = await db.reconcile();
  assert.equal(report.orphansAdopted, 1);

  const index = await db.getIndex();
  assert.equal(index.length, 1);
  assert.equal(index[0].id, created.id);
});

await test('reconcile drops a dangling index entry', async () => {
  await db.init();
  const created = await db.createCollection(sampleCollection());

  // Simulate a record that vanished while the index survived.
  delete mock.raw()[`tc:c:${created.id}`];

  const report = await db.reconcile();
  assert.equal(report.danglingRemoved, 1);
  assert.deepEqual(await db.getIndex(), []);
});

section('db — duplicates');

await test('findDuplicates ignores trailing slashes and fragments', async () => {
  await db.init();
  await db.createCollection({
    title: 'A',
    tabs: [{ url: 'https://example.com/page', title: 'Page' }],
  });
  await db.createCollection({
    title: 'B',
    tabs: [{ url: 'https://example.com/page#section', title: 'Page again' }],
  });

  const { totalExtra, groups } = await db.findDuplicates();
  assert.equal(totalExtra, 1);
  assert.equal(groups[0].hits.length, 2);
});

await test('mergeDuplicates keeps the oldest copy', async () => {
  await db.init();
  // Explicit timestamps: the index is newest-first, so "oldest wins" is only
  // meaningful if the two collections have genuinely different createdAt values.
  const first = await db.createCollection({
    title: 'First',
    createdAt: Date.now() - 86400000,
    tabs: [{ url: 'https://example.com/x', title: 'Original' }],
  });
  await db.createCollection({
    title: 'Second',
    createdAt: Date.now(),
    tabs: [{ url: 'https://example.com/x', title: 'Copy' }],
  });

  const { removed } = await db.mergeDuplicates();
  assert.equal(removed, 1);

  const kept = await db.getCollection(first.id);
  assert.equal(kept.tabs.length, 1, 'the first copy survived');
});

/* ------------------------------------------------------- restore points ---- */

section('snapshots — restore points');

await test('capture records the whole library state', async () => {
  await db.init();
  await db.createCollection(sampleCollection());

  const snap = await snapshots.capture('test');
  assert.equal(snap.stats.collections, 1);
  assert.equal(snap.stats.tabs, 3);

  const list = await snapshots.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].reason, 'test');
});

await test('capturing an empty library is a no-op', async () => {
  await db.init();
  assert.equal(await snapshots.capture('test'), null);
  assert.equal((await snapshots.list()).length, 0);
});

await test('a delete writes a restore point first', async () => {
  await db.init();
  const created = await db.createCollection(sampleCollection());
  await db.deleteCollection(created.id);

  const list = await snapshots.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].stats.collections, 1, 'the snapshot predates the delete');
});

await test('rolling back restores the earlier state and removes newer records', async () => {
  await db.init();
  const original = await db.createCollection(sampleCollection({ title: 'Original' }));
  const snap = await snapshots.capture('before');

  await db.updateCollection(original.id, { title: 'Changed' });
  const extra = await db.createCollection(sampleCollection({ title: 'Added later' }));

  await snapshots.restore(snap.ts);

  const index = await db.getIndex();
  assert.equal(index.length, 1, 'the newer collection is gone');
  assert.equal(index[0].title, 'Original');
  assert.equal(await db.getCollection(extra.id), null, 'its record is gone too');
});

await test('rolling back is itself undoable', async () => {
  await db.init();
  await db.createCollection(sampleCollection());
  const snap = await snapshots.capture('before');
  await snapshots.restore(snap.ts);

  const list = await snapshots.list();
  assert.ok(list.length >= 2, 'a snapshot of the pre-rollback state was taken');
});

await test('snapshot keys never collide inside the same millisecond', async () => {
  await db.init();
  await db.createCollection(sampleCollection());

  const a = await snapshots.capture('first', Infinity);
  const b = await snapshots.capture('second', Infinity);

  assert.notEqual(a.ts, b.ts, 'the second capture stepped past the first');
  assert.equal((await snapshots.list()).length, 2, 'neither was overwritten');
});

await test('prune keeps only the newest N restore points', async () => {
  await db.init();
  await db.createCollection(sampleCollection());

  for (let i = 0; i < 14; i++) await snapshots.capture(`r${i}`, Infinity);
  assert.equal((await snapshots.list()).length, 14);

  await snapshots.prune(10);
  const kept = await snapshots.list();
  assert.equal(kept.length, 10);
  assert.equal(kept[0].reason, 'r13', 'the newest survived');
});

/* --------------------------------------------------------------- search ---- */

section('search');

async function seedSearchCorpus() {
  await db.init();
  await db.createCollection({
    title: 'Tax research',
    tabs: [
      { url: 'https://gov.uk/statutory-residence', title: 'Statutory residence test' },
      { url: 'https://oecd.org/treaties', title: 'Double taxation treaties' },
      { url: 'https://cafe.example/menu', title: 'Café menu' },
    ],
    groups: [],
  });
  await db.createCollection({
    title: 'Sprint 42',
    tabs: [{ url: 'https://github.com/pr/482', title: 'Pull request 482' }],
    groups: [],
  });
  search.invalidate();
}

await test('a title-start match outranks a URL match', async () => {
  await seedSearchCorpus();
  const results = await search.search('statutory');
  assert.ok(results.tabs.length >= 1);
  assert.equal(results.tabs[0].title, 'Statutory residence test');
});

await test('search is diacritic-insensitive', async () => {
  await seedSearchCorpus();
  const results = await search.search('cafe');
  assert.equal(results.tabs.length, 1);
  assert.equal(results.tabs[0].title, 'Café menu');
});

await test('multiple tokens are ANDed', async () => {
  await seedSearchCorpus();
  assert.equal((await search.search('double taxation')).tabs.length, 1);
  assert.equal((await search.search('double nonsense')).tabs.length, 0);
});

await test('matching collections are surfaced separately from tabs', async () => {
  await seedSearchCorpus();
  const results = await search.search('sprint');
  assert.equal(results.collections.length, 1);
  assert.equal(results.collections[0].title, 'Sprint 42');
});

await test('an empty query returns nothing rather than everything', async () => {
  await seedSearchCorpus();
  const results = await search.search('   ');
  assert.equal(results.total, 0);
});

await test('search stays under budget on a large library', async () => {
  await db.init();
  const tabs = [];
  for (let i = 0; i < 20000; i++) {
    tabs.push({ url: `https://example.com/page-${i}`, title: `Document number ${i}` });
  }
  await db.createCollection({ title: 'Big', tabs, groups: [] });
  search.invalidate();

  await search.search('warm-up'); // build the corpus outside the measurement
  const started = performance.now();
  const results = await search.search('document number 19999');
  const elapsed = performance.now() - started;

  assert.ok(results.tabs.length >= 1, 'the needle was found');
  assert.ok(elapsed < 150, `search took ${elapsed.toFixed(0)}ms, budget is 150ms`);
});

await test('highlight ranges merge overlapping matches', async () => {
  const ranges = search.highlightRanges('residence residence', 'residence resid');
  for (let i = 1; i < ranges.length; i++) {
    assert.ok(ranges[i].start > ranges[i - 1].end, 'ranges do not overlap');
  }
});

/* --------------------------------------------------------------- export ---- */

section('exporter');

await test('JSON export round-trips losslessly through import', async () => {
  await db.init();
  await db.createCollection(sampleCollection());

  const payload = await exporter.exportLibrary('json');
  const parsed = importer.parse(payload.content);

  assert.equal(parsed.format, 'tabcove-json');
  assert.equal(parsed.stats.collections, 1);
  assert.equal(parsed.stats.tabs, 3);
  assert.equal(parsed.collections[0].groups.length, 1);
  assert.equal(parsed.collections[0].groups[0].color, 'blue');
});

await test('HTML export escapes a hostile page title', async () => {
  await db.init();
  await db.createCollection({
    title: '<script>alert(1)</script>',
    tabs: [{ url: 'https://evil.example', title: '"><img src=x onerror=alert(1)>' }],
  });

  const { content } = await exporter.exportLibrary('html');
  assert.ok(!content.includes('<script>alert(1)</script>'), 'the title was escaped');
  assert.ok(!content.includes('onerror=alert(1)>'), 'the attribute payload was escaped');
  assert.ok(content.includes('&lt;script&gt;'));
});

await test('CSV export defuses formula injection', async () => {
  await db.init();
  await db.createCollection({
    title: 'Sheet',
    tabs: [{ url: 'https://a.example', title: '=cmd|calc!A1' }],
  });

  const { content } = await exporter.exportLibrary('csv');
  assert.ok(content.includes('"\'=cmd|calc!A1"'), 'the leading = was neutralised');
});

await test('Markdown export escapes link syntax', async () => {
  await db.init();
  await db.createCollection({
    title: 'Notes',
    tabs: [{ url: 'https://a.example', title: 'Broken ] bracket' }],
  });

  const { content } = await exporter.exportLibrary('markdown');
  assert.ok(content.includes('Broken \\] bracket'));
});

await test('every declared format produces content', async () => {
  await db.init();
  await db.createCollection(sampleCollection());

  for (const fmt of constants.EXPORT_FORMATS) {
    const payload = await exporter.exportLibrary(fmt);
    assert.ok(payload.content.length > 0, `${fmt} produced content`);
    assert.ok(payload.filename.startsWith('tabcove-'), `${fmt} filename is branded`);
  }
});

/* --------------------------------------------------------------- import ---- */

section('importer');

await test('OneTab text is detected and parsed into blocks', async () => {
  const text = [
    'https://example.com/a | Page A',
    'https://example.com/b | Page B',
    '',
    'https://example.org/c | Page C',
  ].join('\n');

  const parsed = importer.parse(text);
  assert.equal(parsed.format, 'onetab-text');
  assert.equal(parsed.collections.length, 2, 'a blank line separates lists');
  assert.equal(parsed.collections[0].tabs.length, 2);
  assert.equal(parsed.collections[0].tabs[0].title, 'Page A');
});

await test("Tabcove's own text export round-trips its collection names", async () => {
  await db.init();
  await db.createCollection(sampleCollection());
  const { content } = await exporter.exportLibrary('text');

  const parsed = importer.parse(content);
  assert.equal(parsed.collections[0].title, 'Tax research');
});

await test('a plain URL list is accepted', async () => {
  const parsed = importer.parse('https://a.example\nhttps://b.example\n');
  assert.equal(parsed.format, 'url-list');
  assert.equal(parsed.collections[0].tabs.length, 2);
});

await test('Markdown links and HTML anchors are recognised', async () => {
  const parsed = importer.parse(
    '- [My page](https://a.example)\n<a href="https://b.example">Other</a>\n'
  );
  assert.equal(parsed.collections[0].tabs.length, 2);
  assert.equal(parsed.collections[0].tabs[0].title, 'My page');
  assert.equal(parsed.collections[0].tabs[1].title, 'Other');
});

await test('junk input fails with an actionable message', () => {
  assert.throws(() => importer.parse('the quick brown fox'), /tab list/i);
  assert.throws(() => importer.parse(''), /nothing to import/i);
});

await test('import writes a restore point before touching the library', async () => {
  await db.init();
  await db.createCollection(sampleCollection());

  const parsed = importer.parse('https://new.example | New page');
  await importer.importCollections(parsed.collections);

  const list = await snapshots.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].reason, constants.SNAPSHOT_REASON.IMPORT);
});

await test('replace mode clears the library first', async () => {
  await db.init();
  await db.createCollection(sampleCollection({ title: 'Old' }));

  const parsed = importer.parse('https://new.example | New page');
  await importer.importCollections(parsed.collections, { mode: 'replace' });

  const index = await db.getIndex();
  assert.equal(index.length, 1);
  assert.notEqual(index[0].title, 'Old');
});

/* --------------------------------------------------------------- format ---- */

section('format');

await test('relativeTime reads naturally across the range', () => {
  const now = Date.now();
  assert.equal(format.relativeTime(now - 10 * 1000, now), 'just now');
  assert.equal(format.relativeTime(now - 5 * 60000, now), '5 minutes ago');
  assert.equal(format.relativeTime(now - 3 * 3600000, now), '3 hours ago');
  assert.equal(format.relativeTime(now - 26 * 3600000, now), 'yesterday');
  assert.equal(format.relativeTime(now - 3 * 86400000, now), '3 days ago');
  assert.equal(format.relativeTime(0, now), 'never');
});

await test('plural agrees with its number', () => {
  assert.equal(format.plural(1, 'tab'), '1 tab');
  assert.equal(format.plural(12, 'tab'), '12 tabs');
  assert.equal(format.plural(2, 'match', 'matches'), '2 matches');
});

await test('bytes formats at every scale', () => {
  assert.equal(format.bytes(0), '0 B');
  assert.equal(format.bytes(512), '512 B');
  assert.equal(format.bytes(2048), '2.0 KB');
  assert.equal(format.bytes(5 * 1024 * 1024), '5.0 MB');
});

await test('hostname strips www and survives junk', () => {
  assert.equal(format.hostname('https://www.example.com/a'), 'example.com');
  assert.equal(format.hostname('not a url'), '');
});

await test('truncate keeps both ends readable', () => {
  const out = format.truncate('a'.repeat(40) + 'ZZZ', 20);
  assert.ok(out.length <= 21);
  assert.ok(out.endsWith('ZZZ'));
});

/* ------------------------------------------------------- settings & tier ---- */

section('settings, flags, and the licence seam');

await test('settings merge over defaults and drop unknown keys', async () => {
  const saved = await settings.setSettings({ theme: 'dark', bogusKey: 'nope' });
  assert.equal(saved.theme, 'dark');
  assert.equal(saved.bogusKey, undefined);
  assert.equal(saved.closeAfterStow, constants.DEFAULT_SETTINGS.closeAfterStow);
});

await test('settings coerce to the type of their default', async () => {
  settings.invalidate();
  const saved = await settings.setSettings({ batchSize: '12', closeAfterStow: 'yes' });
  assert.equal(saved.batchSize, 12);
  assert.equal(saved.closeAfterStow, true);
});

await test('restore is non-destructive by default', () => {
  assert.equal(
    constants.DEFAULT_SETTINGS.consumeOnRestore,
    false,
    'a library you empty by reading from it is not a library'
  );
});

await test('the free tier is unlimited in collections and tabs', () => {
  assert.equal(constants.LIMITS.free.collections, Infinity);
  assert.equal(constants.LIMITS.free.tabs, Infinity);
});

await test('every free flag resolves true without a licence', async () => {
  for (const [name, def] of Object.entries(flags.FLAGS)) {
    if (def.tier !== 'free') continue;
    assert.equal(await flags.can(name), true, `${name} is available free`);
  }
});

await test('pro flags are closed and unknown flags fail closed', async () => {
  assert.equal(await flags.can('cloudSync'), false);
  assert.equal(await flags.can('somethingInvented'), false);
});

await test('the licence stub resolves to free and declines keys honestly', async () => {
  const current = await license.getLicense();
  assert.equal(current.tier, 'free');
  assert.equal(await license.isPro(), false);

  const attempt = await license.activate('ANY-KEY');
  assert.equal(attempt.ok, false);
  assert.match(attempt.reason, /not available yet/i);
});

/* --------------------------------------------------------------- summary ---- */

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);

if (failed) {
  process.stdout.write('\nFailures:\n');
  for (const { name, error } of failures) {
    process.stdout.write(`\n  ${name}\n${error.stack}\n`);
  }
  process.exit(1);
}
