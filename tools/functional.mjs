/**
 * Tabcove — end-to-end functional tests, against the real Chrome APIs.
 *
 *     node tools/functional.mjs                 test extension/
 *     node tools/functional.mjs <path>          test an extracted release ZIP
 *
 * The unit suite in tools/test.mjs runs against a chrome.storage mock. That
 * proves the data layer, but says nothing about whether capture actually reads a
 * live tab, or whether restore actually rebuilds a live Chrome tab group with
 * the right name and colour. This does — it drives the shipping extension inside
 * a real browser and asserts on real browser state.
 */

import path from 'node:path';
import { rm } from 'node:fs/promises';
import { launch, installExtension, openPage, evaluate, EXT } from './drive.mjs';

const target = process.argv[2] ? path.resolve(process.argv[2]) : EXT;

/**
 * The assertion body, evaluated inside a Tabcove extension page — the only
 * context where both the chrome APIs and the extension's own modules exist.
 */
const SCRIPT = String.raw`(async () => {
  const results = [];
  const ok = (name, pass, detail) => results.push({ name, pass: !!pass, detail: detail || '' });
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const tabsQuery = (q) => new Promise(r => chrome.tabs.query(q, r));

  const db        = await import('/lib/db.js');
  const capture   = await import('/lib/capture.js');
  const restore   = await import('/lib/restore.js');
  const snapshots = await import('/lib/snapshots.js');
  const trash     = await import('/lib/trash.js');
  const exporter  = await import('/lib/exporter.js');
  const importer  = await import('/lib/importer.js');
  const settings  = await import('/lib/settings.js');

  // A clean library, so every count below is unambiguous.
  await new Promise(r => chrome.storage.local.clear(r));
  settings.invalidate();
  await db.init();

  // Never close tabs during the run: this page is one of them.
  await settings.setSettings({ closeAfterStow: false, consumeOnRestore: false });

  // ---- set up real browser state -----------------------------------------
  const urls = [
    'https://example.com/alpha',
    'https://example.com/beta',
    'https://example.org/gamma',
    'https://example.net/delta',
    'https://example.com/epsilon',
  ];
  const made = [];
  for (const url of urls) {
    made.push(await new Promise(r => chrome.tabs.create({ url, active: false }, r)));
  }
  await sleep(1000);

  const gid = await new Promise(r => chrome.tabs.group({ tabIds: made.slice(0, 3).map(t => t.id) }, r));
  await new Promise(r => chrome.tabGroups.update(gid, { title: 'Research', color: 'purple' }, r));
  await sleep(500);

  // ---- 1. preview reports real numbers ------------------------------------
  const preview = await capture.preview(capture.SCOPE.CURRENT_WINDOW);
  ok('preview counts live tabs', preview.tabs >= 5, preview.tabs + ' tabs');
  ok('preview counts live tab groups', preview.groups >= 1, preview.groups + ' groups');

  // ---- 2. capture reads titles, URLs, and group metadata ------------------
  const cap = await capture.capture(capture.SCOPE.CURRENT_WINDOW, { title: 'Functional run' });
  ok('capture created a collection', !cap.empty && cap.collection.tabs.length >= 5,
     (cap.collection ? cap.collection.tabs.length : 0) + ' tabs saved');
  ok('capture preserved the group name and colour',
     cap.collection.groups.some(g => g.title === 'Research' && g.color === 'purple'),
     JSON.stringify(cap.collection.groups));
  ok('captured tabs carry real URLs',
     cap.collection.tabs.every(t => t.url.indexOf('https://') === 0));
  ok('grouped tabs point at a group index',
     cap.collection.tabs.filter(t => t.groupId >= 0).length >= 3);
  ok('the library page excluded itself from the capture',
     cap.collection.tabs.every(t => t.url.indexOf('chrome-extension://') !== 0));

  // ---- 3. the index agrees with the record --------------------------------
  const index = await db.getIndex();
  ok('index holds exactly one entry', index.length === 1);
  ok('index count matches the record', index[0].count === cap.collection.tabs.length);

  // ---- 4. restore rebuilds tabs and the tab group -------------------------
  const before = (await tabsQuery({ currentWindow: true })).length;
  const res = await restore.restoreCollection(cap.collection.id, { newWindow: false });
  await sleep(1600);
  const after = (await tabsQuery({ currentWindow: true })).length;

  ok('restore opened the tabs', res.opened >= 5, res.opened + ' opened');
  ok('restore changed the real window', after > before, before + ' -> ' + after + ' tabs');
  ok('restore rebuilt a tab group', res.groupsRestored >= 1, res.groupsRestored + ' groups');

  const liveGroups = await new Promise(r => chrome.tabGroups.query({}, r));
  ok('the rebuilt group kept its name and colour',
     liveGroups.some(g => g.title === 'Research' && g.color === 'purple'),
     liveGroups.map(g => g.title + '/' + g.color).join(', '));

  // ---- 5. restore is non-destructive --------------------------------------
  ok('restore did not consume the collection',
     (await db.getCollection(cap.collection.id)) !== null);

  // ---- 6. delete goes to the bin, snapshot first --------------------------
  await db.deleteCollection(cap.collection.id);
  ok('delete emptied the index', (await db.getIndex()).length === 0);
  ok('delete wrote a restore point first', (await snapshots.list()).length >= 1);
  const binned = await trash.list();
  ok('delete moved it to the undo bin',
     binned.length === 1 && binned[0].collection.title === 'Functional run');

  // ---- 7. undo puts it back ----------------------------------------------
  const back = await db.restoreFromTrash(cap.collection.id);
  ok('undo restored the collection', back.title === 'Functional run');
  ok('undo restored every tab', back.tabs.length === cap.collection.tabs.length,
     back.tabs.length + ' of ' + cap.collection.tabs.length);
  ok('undo emptied the bin', (await trash.list()).length === 0);

  // ---- 8. export / import round trip --------------------------------------
  const json = await exporter.exportLibrary('json');
  const parsed = importer.parse(json.content);
  ok('JSON export re-imports losslessly', parsed.stats.tabs === back.tabs.length,
     parsed.stats.tabs + ' vs ' + back.tabs.length);
  ok('the round trip keeps tab groups',
     parsed.collections[0].groups.some(g => g.title === 'Research'));

  const html = await exporter.exportLibrary('html');
  ok('HTML export is a complete document', html.content.indexOf('<!doctype html>') === 0);

  const text = await exporter.exportLibrary('text');
  ok('plain-text export re-imports', importer.parse(text.content).stats.tabs === back.tabs.length);

  // ---- 9. a restore point rolls the library back --------------------------
  const marker = await snapshots.capture('functional marker');
  await db.createCollection({
    title: 'Added after the snapshot',
    tabs: [{ url: 'https://example.com/later', title: 'later' }],
  });
  ok('library grew before the rollback', (await db.getIndex()).length === 2);
  await snapshots.restore(marker.ts);
  const rolled = await db.getIndex();
  ok('rollback removed the newer collection',
     rolled.length === 1 && rolled[0].title === 'Functional run',
     rolled.map(e => e.title).join(', '));

  // ---- 10. unrestorable URLs are reported, not silently dropped -----------
  const blocked = await db.createCollection({
    title: 'Blocked',
    tabs: [{ url: 'https://chromewebstore.google.com/detail/x', title: 'Store page' }],
  });
  const blockedResult = await restore.restoreCollection(blocked.id);
  ok('a blocked URL is reported rather than dropped', blockedResult.skipped.length === 1,
     blockedResult.skipped.length ? blockedResult.skipped[0].reason : 'nothing reported');

  // ---- 11. a locked collection refuses deletion ---------------------------
  await db.updateCollection(blocked.id, { locked: true });
  let refused = false;
  try { await db.deleteCollection(blocked.id); } catch { refused = true; }
  ok('a locked collection refuses deletion', refused);

  // ---- 12. stats and quota read back --------------------------------------
  const stats = await db.getStats();
  ok('stats read back', stats.collections >= 1 && stats.tabs >= 1,
     stats.collections + ' collections, ' + stats.tabs + ' tabs');

  const bytes = await new Promise(r => chrome.storage.local.getBytesInUse(null, r));
  ok('storage reports a real size', bytes > 0, bytes + ' bytes');

  return results;
})()`;

async function main() {
  const { cdp, child, profile, version } = await launch();
  const id = await installExtension(cdp, target);

  console.log('Tabcove functional tests');
  console.log('='.repeat(60));
  console.log(`  browser    ${version}`);
  console.log(`  extension  ${id}`);
  console.log(`  source     ${target}\n`);

  const page = await openPage(cdp, `chrome-extension://${id}/library/library.html`);

  let results;
  try {
    results = await evaluate(cdp, page.sessionId, SCRIPT);
  } catch (error) {
    console.log(`  FAIL  the test script threw: ${error.message}`);
    cdp.close();
    child.kill();
    await rm(profile, { recursive: true, force: true }).catch(() => {});
    return 1;
  }

  let failed = 0;
  for (const { name, pass, detail } of results) {
    if (!pass) failed++;
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  }

  // Favicon and network errors are expected in an offline headless browser.
  const problems = page.problems.filter((p) => !/favicon|ERR_|net::/i.test(p));
  for (const problem of problems) console.log(`  !     ${problem}`);

  cdp.close();
  child.kill();
  await rm(profile, { recursive: true, force: true }).catch(() => {});

  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  return failed ? 1 : 0;
}

process.exit(await main());
