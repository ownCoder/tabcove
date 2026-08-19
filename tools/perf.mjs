/**
 * Tabcove — performance measurement, in a real browser.
 *
 *     node tools/perf.mjs
 *
 * Produces the numbers quoted in docs/architecture.md and docs/testing-report.md.
 * They are measured rather than asserted, so if a change makes the product
 * slower the documents have to change with it.
 */

import { launch, installExtension, openPage, evaluate, EXT } from './drive.mjs';
import { rm } from 'node:fs/promises';

const SCRIPT = String.raw`(async () => {
  const db     = await import('/lib/db.js');
  const search = await import('/lib/search.js');
  const out    = {};

  await new Promise(r => chrome.storage.local.clear(r));
  await db.init();

  // ---- build a large, realistic library -----------------------------------
  const HOSTS = ['example.com', 'gov.uk', 'github.com', 'arxiv.org', 'nature.com',
                 'stripe.com', 'notion.so', 'figma.com', 'oecd.org', 'mdn.io'];
  const WORDS = ['statutory', 'residence', 'payment', 'intent', 'schedule', 'review',
                 'analysis', 'treaty', 'model', 'convention', 'document', 'summary',
                 'reference', 'guide', 'report', 'archive', 'session', 'checkout'];

  const COLLECTIONS = 200;
  const PER = 100;                 // 20,000 tabs

  const buildStart = performance.now();
  for (let c = 0; c < COLLECTIONS; c++) {
    const tabs = [];
    for (let i = 0; i < PER; i++) {
      const n = c * PER + i;
      const host = HOSTS[n % HOSTS.length];
      const a = WORDS[n % WORDS.length];
      const b = WORDS[(n * 7 + 3) % WORDS.length];
      tabs.push({
        url: 'https://' + host + '/' + a + '/' + b + '/' + n,
        title: a.charAt(0).toUpperCase() + a.slice(1) + ' ' + b + ' — item ' + n,
        groupId: i % 10 === 0 ? 0 : -1,
        windowIx: 0,
      });
    }
    await db.createCollection({
      title: 'Collection ' + c,
      tabs,
      groups: [{ title: 'Group ' + c, color: 'blue', collapsed: false }],
    });
  }
  out.buildMs = Math.round(performance.now() - buildStart);
  const stats = await db.getStats();
  out.collections = stats.collections;
  out.tabs = stats.tabs;

  // ---- index read: what the library list actually costs --------------------
  // Sampled repeatedly. The first read straight after 20,000 writes pays for
  // storage compaction, which is a one-off cost a real user never sees; the
  // median is what the library actually opens at.
  const indexSamples = [];
  for (let i = 0; i < 7; i++) {
    const s = performance.now();
    await db.getIndex();
    indexSamples.push(+(performance.now() - s).toFixed(1));
    await new Promise(r => setTimeout(r, 60));
  }
  out.indexSamples = indexSamples;
  out.indexFirstMs = indexSamples[0];
  out.indexReadMs = indexSamples.slice(1).sort((a, b) => a - b)[Math.floor((indexSamples.length - 1) / 2)];

  // ---- one collection read: what expanding a collection costs -------------
  const index = await db.getIndex();
  let t = performance.now();
  await db.getCollection(index[0].id);
  out.oneCollectionReadMs = +(performance.now() - t).toFixed(1);

  // ---- write cost: saving 20 tabs into a full library ---------------------
  t = performance.now();
  await db.createCollection({
    title: 'Timed write',
    tabs: Array.from({ length: 20 }, (_, i) => ({
      url: 'https://example.com/timed/' + i, title: 'Timed ' + i,
    })),
    groups: [],
  });
  out.write20TabsMs = +(performance.now() - t).toFixed(1);

  // ---- search: corpus build, then steady-state keystrokes -----------------
  search.invalidate();
  t = performance.now();
  await search.search('statutory');
  out.firstSearchMs = Math.round(performance.now() - t);   // includes corpus build

  const queries = ['statutory', 'payment intent', 'treaty', 'item 19999', 'github', 'zzz'];
  const timings = [];
  for (const q of queries) {
    const s = performance.now();
    const r = await search.search(q);
    timings.push({ q, ms: +(performance.now() - s).toFixed(1), hits: r.total });
  }
  out.searches = timings;
  out.searchMedianMs = timings.map(x => x.ms).sort((a, b) => a - b)[Math.floor(timings.length / 2)];
  out.searchWorstMs = Math.max(...timings.map(x => x.ms));

  // ---- stow: capture 30 real tabs into a full library ---------------------
  const settings = await import('/lib/settings.js');
  const capture  = await import('/lib/capture.js');
  await settings.setSettings({ closeAfterStow: false });

  const opened = [];
  for (let i = 0; i < 30; i++) {
    opened.push(await new Promise(r => chrome.tabs.create({
      url: 'https://example.com/stow-target/' + i, active: false,
    }, r)));
  }
  await new Promise(r => setTimeout(r, 1500));

  t = performance.now();
  const stowed = await capture.capture(capture.SCOPE.CURRENT_WINDOW, { title: 'Timed stow' });
  out.stowMs = Math.round(performance.now() - t);
  out.stowTabs = stowed.empty ? 0 : stowed.collection.tabs.length;

  await new Promise(r => chrome.tabs.remove(opened.map(x => x.id), r));

  // ---- storage footprint ---------------------------------------------------
  out.bytes = await new Promise(r => chrome.storage.local.getBytesInUse(null, r));
  out.bytesPerTab = Math.round(out.bytes / out.tabs);

  // ---- reconcile over the whole key space ---------------------------------
  t = performance.now();
  await db.reconcile();
  out.reconcileMs = Math.round(performance.now() - t);

  return out;
})()`;

async function main() {
  const { cdp, child, profile, version } = await launch();
  const id = await installExtension(cdp, EXT);
  const page = await openPage(cdp, `chrome-extension://${id}/library/library.html`);

  console.log('Tabcove performance');
  console.log('='.repeat(60));
  console.log(`  ${version}\n`);

  // Building a 20,000-tab library legitimately takes minutes.
  const r = await evaluate(cdp, page.sessionId, SCRIPT, 900000);

  const row = (label, value, budget) => {
    const within = budget === undefined ? '' : value <= budget ? '  within budget' : '  OVER BUDGET';
    console.log(`  ${label.padEnd(38)} ${String(value).padStart(9)}${within}`);
  };

  console.log(`  library size                      ${r.collections} collections, ${r.tabs.toLocaleString()} tabs`);
  console.log(`  built in                          ${(r.buildMs / 1000).toFixed(1)}s\n`);

  row('index read, median (ms)', r.indexReadMs, 50);
  row('index read, first after bulk write (ms)', r.indexFirstMs);
  row('one collection read (ms)', r.oneCollectionReadMs, 20);
  row('write 20 tabs into a full library (ms)', r.write20TabsMs, 100);
  row('first search, incl. corpus build (ms)', r.firstSearchMs, 1500);
  row('search, median (ms)', r.searchMedianMs, 150);
  row('search, worst (ms)', r.searchWorstMs, 150);
  row('reconcile whole key space (ms)', r.reconcileMs, 2000);
  row(`stow ${r.stowTabs} real tabs (ms)`, r.stowMs, 500);
  console.log('');
  row('storage used (bytes)', r.bytes.toLocaleString());
  row('bytes per saved tab', r.bytesPerTab, 200);

  console.log('\n  per-query search timings');
  for (const s of r.searches) {
    console.log(`    ${('"' + s.q + '"').padEnd(20)} ${String(s.ms).padStart(7)} ms   ${s.hits} hits`);
  }

  // ---- first contentful paint, with the 20,000-tab library already in place --
  console.log('\n  first contentful paint (20,000 tabs saved)');
  const surfaces = [
    ['popup', `chrome-extension://${id}/popup/popup.html`, 360, 600],
    ['library', `chrome-extension://${id}/library/library.html`, 1280, 800],
    ['options', `chrome-extension://${id}/options/options.html`, 1280, 900],
  ];

  for (const [name, url, width, height] of surfaces) {
    const surface = await openPage(cdp, url);
    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile: false },
      surface.sessionId
    );
    const paint = await evaluate(
      cdp,
      surface.sessionId,
      `(() => {
        const fcp = performance.getEntriesByType('paint')
          .find(e => e.name === 'first-contentful-paint');
        return {
          fcp: fcp ? Math.round(fcp.startTime) : null,
          nodes: document.getElementsByTagName('*').length,
        };
      })()`
    );
    console.log(
      `    ${name.padEnd(10)} ${String(paint.fcp).padStart(5)} ms   ${paint.nodes} DOM nodes`
    );
    await cdp.send('Target.closeTarget', { targetId: surface.targetId });
  }

  cdp.close();
  child.kill();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
  return 0;
}

process.exit(await main());
