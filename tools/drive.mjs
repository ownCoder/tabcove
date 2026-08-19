/**
 * Tabcove — real-browser driver.
 *
 *     node tools/drive.mjs verify        load the extension, report console errors
 *     node tools/drive.mjs shots         seed demo data and capture store screenshots
 *
 * Loads the ACTUAL unpacked extension into a real Chrome, seeds a realistic
 * library through chrome.storage, and drives the real UI. The store screenshots
 * are therefore photographs of the shipping product, not mockups — which is both
 * a Chrome Web Store requirement and the only way the listing can stay honest.
 *
 * Zero dependencies: Node 22+ ships a global WebSocket, so the DevTools Protocol
 * client below is about 60 lines. Nothing here is part of the extension.
 */

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not URL.pathname: the latter leaves %20 in place, and a
// path with an escaped space is one Chrome cannot resolve.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXT = path.join(ROOT, 'extension');
const SHOTS = path.join(ROOT, 'screenshots', 'raw');
const PORT = 9333;

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

/**
 * Install the unpacked extension and return its id.
 *
 * `--load-extension` was removed from Chrome in M137 for security reasons: it is
 * silently ignored, which makes a naive "it launched, so it loaded" check pass
 * against an extension that was never installed. The DevTools Extensions domain
 * is the supported replacement, and it returns the real id rather than a guess.
 */
async function installExtension(cdp, extensionPath) {
  const result = await cdp.send('Extensions.loadUnpacked', { path: extensionPath });
  if (!result?.id) throw new Error('Chrome refused to load the extension.');
  return result.id;
}

/* -------------------------------------------------------------- CDP client --- */

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();

    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      } else if (message.method) {
        for (const fn of this.listeners.get(message.method) || []) fn(message.params, message);
      }
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error(`cannot connect to ${url}`)), { once: true });
    });
    return new CDP(ws);
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`${method} timed out`));
      }, 30000);
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }

  close() {
    this.ws.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------- browser --- */

async function launch() {
  const binary = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!binary) throw new Error('No Chrome or Edge binary found.');

  const profile = await mkdtemp(path.join(tmpdir(), 'tabcove-'));

  const child = spawn(
    binary,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=Translate,MediaRouter',
      '--force-device-scale-factor=1',
      // Chrome 137+ ignores --load-extension entirely, so the extension is
      // installed through the CDP Extensions domain instead. That switch is what
      // this flag unlocks.
      '--enable-unsafe-extension-debugging',
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${PORT}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  // Wait for the DevTools endpoint to answer.
  let info = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      info = await response.json();
      break;
    } catch {
      await sleep(250);
    }
  }
  if (!info) throw new Error('Chrome did not expose a DevTools endpoint.');

  const cdp = await CDP.connect(info.webSocketDebuggerUrl);
  return { cdp, child, profile, version: info.Browser };
}

/**
 * Open a page target and attach to it.
 *
 * The target is created directly AT the extension URL. Creating it at
 * about:blank and navigating afterwards does not work here: the cross-process
 * hop into a chrome-extension:// origin swaps the renderer, and the attached
 * session is left pointed at the discarded document. Instead we open the real
 * URL and then reload once with instrumentation enabled, which gives a clean
 * capture of load-time console output.
 */
async function openPage(cdp, url) {
  const { targetId } = await cdp.send('Target.createTarget', { url });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

  const problems = [];
  cdp.on('Runtime.consoleAPICalled', (params, message) => {
    if (message.sessionId !== sessionId) return;
    if (params.type === 'error' || params.type === 'warning') {
      problems.push(`${params.type}: ${params.args.map((a) => a.value ?? a.description).join(' ')}`);
    }
  });
  cdp.on('Runtime.exceptionThrown', (params, message) => {
    if (message.sessionId !== sessionId) return;
    const d = params.exceptionDetails;
    problems.push(`exception: ${d.exception?.description || d.text}`);
  });

  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Log.enable', {}, sessionId);

  // Reload with instrumentation attached, so load-time errors are captured.
  await cdp.send('Page.reload', {}, sessionId);

  // Poll rather than sleep: module scripts and the first storage read complete
  // at wildly different speeds depending on how busy the machine is.
  const expected = url.split('?')[0].split('#')[0];
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      ready = await evaluate(
        cdp,
        sessionId,
        `document.readyState === 'complete' &&
         location.href.startsWith(${JSON.stringify(expected)}) &&
         typeof chrome !== 'undefined' && !!chrome.storage`
      );
    } catch {
      ready = false; // the execution context is being replaced mid-navigation
    }
    if (ready) break;
    await sleep(200);
  }
  if (!ready) throw new Error(`page never finished loading: ${url}`);

  // One more beat so each page's async entry point has painted.
  await sleep(600);

  return { targetId, sessionId, problems };
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    sessionId
  );
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

async function screenshot(cdp, sessionId, file, { width = 1280, height = 800, scheme = 'light' } = {}) {
  await cdp.send(
    'Emulation.setDeviceMetricsOverride',
    { width, height, deviceScaleFactor: 1, mobile: false },
    sessionId
  );
  // Headless inherits the host's colour-scheme preference, which would make the
  // light screenshots come out dark on a dark machine. Pin it per shot.
  await cdp.send(
    'Emulation.setEmulatedMedia',
    { features: [{ name: 'prefers-color-scheme', value: scheme }] },
    sessionId
  );
  await sleep(350);
  const { data } = await cdp.send(
    'Page.captureScreenshot',
    { format: 'png', captureBeyondViewport: false },
    sessionId
  );
  await writeFile(file, Buffer.from(data, 'base64'));
  return file;
}

/* -------------------------------------------------------------- demo data --- */

/**
 * A realistic library, written straight into chrome.storage in the extension's
 * own record shape. Content is deliberately mundane and plausible: store
 * screenshots full of "Example Item 1" read as a prototype.
 */
function seedScript() {
  const now = Date.now();
  const hour = 3600000;
  const day = 24 * hour;

  const collections = [
    {
      id: 'tc0001',
      title: 'Statutory residence — chapter 3',
      createdAt: now - 2 * hour,
      updatedAt: now - 2 * hour,
      pinned: true,
      tags: ['research'],
      windows: 1,
      groups: [
        { title: 'Legislation', color: 'blue', collapsed: false },
        { title: 'Commentary', color: 'purple', collapsed: false },
      ],
      tabs: [
        ['https://www.gov.uk/government/publications/rdr3-statutory-residence-test-srt', 'RDR3: Statutory Residence Test — GOV.UK', 0],
        ['https://www.legislation.gov.uk/ukpga/2013/29/schedule/45', 'Finance Act 2013, Schedule 45', 0],
        ['https://www.oecd.org/tax/treaties/model-tax-convention', 'Model Tax Convention on Income and Capital', 0],
        ['https://taxjournal.com/articles/the-srt-ten-years-on', 'The SRT, ten years on — Tax Journal', 1],
        ['https://www.icaew.com/technical/tax/residence-and-domicile', 'Residence and domicile — ICAEW', 1],
        ['https://www.step.org/industry-news/uk-residence-rules', 'UK residence rules explained — STEP', 1],
        ['https://en.wikipedia.org/wiki/Tax_residence', 'Tax residence — Wikipedia', -1],
        ['https://www.investopedia.com/terms/t/tax-home.asp', 'Tax Home: What It Means', -1],
      ],
    },
    {
      id: 'tc0002',
      title: 'Sprint 42 — checkout rewrite',
      createdAt: now - day,
      updatedAt: now - day,
      tags: ['work'],
      windows: 2,
      groups: [{ title: 'Design', color: 'green', collapsed: false }],
      tabs: [
        ['https://www.figma.com/file/checkout-v3', 'Checkout v3 — Figma', 0],
        ['https://www.notion.so/spec-payments-flow', 'Spec: payments flow', 0],
        ['https://github.com/acme/storefront/pull/482', 'Fix double-charge on retry by dmcallister · Pull Request #482', -1],
        ['https://sentry.io/organizations/acme/issues/91821', 'TypeError: cannot read totals of undefined — Sentry', -1],
        ['https://stripe.com/docs/payments/payment-intents', 'Payment Intents API — Stripe Docs', -1],
        ['https://developer.mozilla.org/en-US/docs/Web/API/Payment_Request_API', 'Payment Request API — MDN', -1],
      ],
    },
    {
      id: 'tc0003',
      title: 'Reading list — long form',
      createdAt: now - 3 * day,
      updatedAt: now - 3 * day,
      tags: ['later'],
      windows: 1,
      groups: [],
      tabs: [
        ['https://www.newyorker.com/magazine/the-quiet-crisis-in-archives', 'The Quiet Crisis in Archives'],
        ['https://longreads.com/how-libraries-lose-things', 'How Libraries Lose Things'],
        ['https://www.theatlantic.com/technology/the-web-is-not-forever', 'The Web Is Not Forever'],
        ['https://arstechnica.com/information-technology/link-rot-study', 'A quarter of the web has already rotted away'],
        ['https://www.nature.com/articles/d41586-024-link-rot', 'Science is losing its citations to link rot'],
      ],
    },
    {
      id: 'tc0004',
      title: 'Holiday — Lisbon, October',
      createdAt: now - 5 * day,
      updatedAt: now - 5 * day,
      tags: ['personal'],
      windows: 1,
      groups: [{ title: 'Stay', color: 'orange', collapsed: false }],
      tabs: [
        ['https://www.booking.com/hotel/pt/alfama-view', 'Alfama View Apartments — Booking.com', 0],
        ['https://www.airbnb.co.uk/rooms/graca-terrace', 'Terrace flat in Graça — Airbnb', 0],
        ['https://www.timeout.com/lisbon/best-restaurants', 'The 30 best restaurants in Lisbon', -1],
        ['https://www.cp.pt/passageiros/en/train-times', 'Train times — Comboios de Portugal', -1],
      ],
    },
    {
      id: 'tc0005',
      title: 'Chrome extension research',
      createdAt: now - 8 * day,
      updatedAt: now - 8 * day,
      tags: ['work'],
      windows: 1,
      groups: [],
      tabs: [
        ['https://developer.chrome.com/docs/extensions/reference/api/tabGroups', 'chrome.tabGroups — Chrome for Developers'],
        ['https://developer.chrome.com/docs/extensions/reference/api/storage', 'chrome.storage — Chrome for Developers'],
        ['https://developer.chrome.com/docs/webstore/program-policies', 'Program policies — Chrome Web Store'],
        ['https://web.dev/articles/virtualize-long-lists', 'Virtualize large lists — web.dev'],
      ],
    },
    {
      id: 'tc0006',
      title: 'Invoices and admin — Q3',
      createdAt: now - 12 * day,
      updatedAt: now - 12 * day,
      tags: ['work'],
      windows: 1,
      groups: [],
      tabs: [
        ['https://quickbooks.intuit.com/invoices/2026-q3', 'Q3 invoices — QuickBooks'],
        ['https://www.gov.uk/vat-returns/deadlines', 'VAT Returns: Deadlines — GOV.UK'],
        ['https://wise.com/gb/business/invoice', 'Business invoicing — Wise'],
      ],
    },
  ];

  const records = {};
  const index = [];

  for (const c of collections) {
    const tabs = c.tabs.map(([url, title, groupId]) => ({
      url,
      title,
      pinned: false,
      groupId: groupId === undefined ? -1 : groupId,
      windowIx: 0,
      savedAt: c.createdAt,
    }));

    const full = {
      id: c.id,
      title: c.title,
      tabs,
      groups: c.groups,
      windows: c.windows,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      rev: 1,
      pinned: !!c.pinned,
      locked: false,
      tags: c.tags,
      note: '',
    };

    records[`tc:c:${c.id}`] = full;
    index.push({
      id: c.id,
      title: c.title,
      count: tabs.length,
      groups: c.groups.length,
      windows: c.windows,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      rev: 1,
      pinned: !!c.pinned,
      locked: false,
      tags: c.tags,
    });
  }

  index.sort((a, b) => b.updatedAt - a.updatedAt);

  const snapshots = {
    [`tc:snap:${now - 2 * hour}`]: {
      ts: now - 2 * hour,
      reason: 'Before deleting a collection',
      index,
      collections: records,
      stats: { collections: 6, tabs: 30 },
    },
    [`tc:snap:${now - 26 * hour}`]: {
      ts: now - 26 * hour,
      reason: 'Before importing',
      index: index.slice(1),
      collections: records,
      stats: { collections: 5, tabs: 22 },
    },
    [`tc:snap:${now - 4 * day}`]: {
      ts: now - 4 * day,
      reason: 'Before emptying the bin',
      index: index.slice(2),
      collections: records,
      stats: { collections: 4, tabs: 18 },
    },
  };

  const trashed = {
    'tc:trash:tc9001': {
      deletedAt: now - 6 * hour,
      collection: {
        id: 'tc9001',
        title: 'Conference talks — shortlist',
        tabs: [
          { url: 'https://example.com/talk-1', title: 'Designing for recovery', groupId: -1, windowIx: 0 },
          { url: 'https://example.com/talk-2', title: 'Storage that survives', groupId: -1, windowIx: 0 },
          { url: 'https://example.com/talk-3', title: 'The cost of a lost tab', groupId: -1, windowIx: 0 },
        ],
        groups: [],
        createdAt: now - 20 * day,
        updatedAt: now - 20 * day,
        tags: [],
        windows: 1,
      },
    },
    'tc:trash:tc9002': {
      deletedAt: now - 2 * day,
      collection: {
        id: 'tc9002',
        title: 'Old bookmarks import',
        tabs: Array.from({ length: 12 }, (_, i) => ({
          url: `https://example.com/bookmark-${i}`,
          title: `Saved page ${i + 1}`,
          groupId: -1,
          windowIx: 0,
        })),
        groups: [],
        createdAt: now - 40 * day,
        updatedAt: now - 40 * day,
        tags: [],
        windows: 1,
      },
    },
  };

  return {
    'tc:meta': {
      schema: 1,
      installedAt: now - 30 * day,
      lastBackupAt: now - 6 * day,
      lastBackupCount: 18,
    },
    'tc:index': index,
    ...records,
    ...snapshots,
    ...trashed,
  };
}

/* ---------------------------------------------------------------- commands --- */

async function verify() {
  const { cdp, child, profile, version } = await launch();
  const id = await installExtension(cdp, EXT);
  console.log(`Browser:      ${version}`);
  console.log(`Extension id: ${id}`);
  await sleep(1200); // let the service worker's onInstalled work settle

  let failed = false;
  const pages = [
    ['popup', `chrome-extension://${id}/popup/popup.html`, 360, 620],
    ['library', `chrome-extension://${id}/library/library.html`, 1280, 800],
    ['options', `chrome-extension://${id}/options/options.html`, 1280, 900],
    ['welcome', `chrome-extension://${id}/welcome/welcome.html`, 1000, 900],
  ];

  // Seed once through the library page, so every surface has data to render.
  const seed = await openPage(cdp, `chrome-extension://${id}/library/library.html`);
  await evaluate(
    cdp,
    seed.sessionId,
    `new Promise(r => chrome.storage.local.set(${JSON.stringify(seedScript())}, () => r(true)))`
  );
  await cdp.send('Target.closeTarget', { targetId: seed.targetId });

  for (const [name, url, width, height] of pages) {
    const page = await openPage(cdp, url);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, page.sessionId);
    await sleep(900);

    const rendered = await evaluate(
      cdp,
      page.sessionId,
      'document.body ? document.body.innerText.trim().length : 0'
    );

    const problems = page.problems.filter(
      (p) => !/favicon|_favicon|net::ERR_FILE_NOT_FOUND/i.test(p)
    );

    const ok = rendered > 40 && problems.length === 0;
    if (!ok) failed = true;

    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(9)} ${rendered} chars rendered`);
    for (const problem of problems) console.log(`         ! ${problem}`);

    await cdp.send('Target.closeTarget', { targetId: page.targetId });
  }

  cdp.close();
  child.kill();
  await rm(profile, { recursive: true, force: true }).catch(() => {});

  console.log(failed ? '\nFAILED' : '\nPASSED - every surface renders cleanly');
  return failed ? 1 : 0;
}

async function shots() {
  await mkdir(SHOTS, { recursive: true });

  const { cdp, child, profile } = await launch();
  const id = await installExtension(cdp, EXT);
  await sleep(1200);

  const seed = await openPage(cdp, `chrome-extension://${id}/library/library.html`);
  await evaluate(
    cdp,
    seed.sessionId,
    `new Promise(r => chrome.storage.local.set(${JSON.stringify(seedScript())}, () => r(true)))`
  );
  await cdp.send('Target.closeTarget', { targetId: seed.targetId });

  // A realistic browser state, so the popup's live counts are real numbers
  // rather than "Nothing to stow". Headless has no network, so these pages fail
  // to load — but chrome.tabs still reports their URLs, which is all the popup
  // reads, and grouping works exactly as it would with real pages.
  const prep = await openPage(cdp, `chrome-extension://${id}/library/library.html`);
  await evaluate(
    cdp,
    prep.sessionId,
    `(async () => {
      const urls = [
        'https://www.figma.com/file/checkout-v3',
        'https://www.notion.so/spec-payments-flow',
        'https://github.com/acme/storefront/pull/482',
        'https://sentry.io/organizations/acme/issues/91821',
        'https://stripe.com/docs/payments/payment-intents',
        'https://developer.mozilla.org/en-US/docs/Web/API/Payment_Request_API',
        'https://news.ycombinator.com/item?id=41822190',
        'https://www.gov.uk/vat-returns/deadlines',
        'https://arxiv.org/abs/2408.01234',
        'https://linear.app/acme/issue/ACM-311',
        'https://calendar.google.com/calendar/u/0/r/week',
        'https://mail.proton.me/u/0/inbox',
      ];
      const created = [];
      for (const url of urls) {
        created.push(await new Promise(r => chrome.tabs.create({ url, active: false }, r)));
      }
      await new Promise(r => setTimeout(r, 1200));

      const design = await new Promise(r =>
        chrome.tabs.group({ tabIds: created.slice(0, 2).map(t => t.id) }, r));
      await new Promise(r => chrome.tabGroups.update(design, { title: 'Design', color: 'green' }, r));

      const bugs = await new Promise(r =>
        chrome.tabs.group({ tabIds: created.slice(2, 5).map(t => t.id) }, r));
      await new Promise(r => chrome.tabGroups.update(bugs, { title: 'Payments bug', color: 'red' }, r));

      return created.length;
    })()`
  );
  await cdp.send('Target.closeTarget', { targetId: prep.targetId });
  await sleep(600);

  const plan = [
    {
      file: '01-library.png',
      url: `chrome-extension://${id}/library/library.html`,
      setup: `(async () => {
        document.querySelector('[data-collection="tc0001"] .collection__toggle').click();
        await new Promise(r => setTimeout(r, 500));
      })()`,
    },
    {
      file: '02-search.png',
      url: `chrome-extension://${id}/library/library.html`,
      setup: `(async () => {
        const input = document.querySelector('#search');
        input.value = 'residence';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 600));
      })()`,
    },
    {
      file: '03-restore-points.png',
      url: `chrome-extension://${id}/library/library.html?view=snapshots`,
      setup: 'Promise.resolve(true)',
    },
    {
      file: '04-undo-bin.png',
      url: `chrome-extension://${id}/library/library.html?view=trash`,
      setup: 'Promise.resolve(true)',
    },
    {
      file: '05-privacy.png',
      url: `chrome-extension://${id}/options/options.html#privacy`,
      height: 980,
      setup: `(async () => {
        document.querySelector('#privacy').scrollIntoView({ block: 'start' });
        await new Promise(r => setTimeout(r, 400));
      })()`,
    },
    {
      // Dark mode comes from the emulated media query alone. Writing a theme
      // into storage would leak into every later shot in this same profile.
      file: '06-dark.png',
      scheme: 'dark',
      url: `chrome-extension://${id}/library/library.html`,
      setup: `(async () => {
        document.querySelector('[data-collection="tc0002"] .collection__toggle').click();
        await new Promise(r => setTimeout(r, 500));
      })()`,
    },
    {
      file: '07-popup.png',
      url: `chrome-extension://${id}/popup/popup.html`,
      width: 360,
      height: 560,
      setup: 'Promise.resolve(true)',
    },
    {
      file: '08-welcome.png',
      url: `chrome-extension://${id}/welcome/welcome.html`,
      height: 900,
      setup: `(async () => { window.scrollTo(0, 0); })()`,
    },
  ];

  for (const step of plan) {
    const page = await openPage(cdp, step.url);
    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      { width: step.width || 1280, height: step.height || 800, deviceScaleFactor: 1, mobile: false },
      page.sessionId
    );
    await cdp.send(
      'Emulation.setEmulatedMedia',
      { features: [{ name: 'prefers-color-scheme', value: step.scheme || 'light' }] },
      page.sessionId
    );
    await sleep(700);
    try {
      await evaluate(cdp, page.sessionId, step.setup);
    } catch (error) {
      console.log(`  ! setup for ${step.file}: ${error.message}`);
    }
    await sleep(400);
    await screenshot(cdp, page.sessionId, path.join(SHOTS, step.file), {
      width: step.width || 1280,
      height: step.height || 800,
      scheme: step.scheme || 'light',
    });
    console.log(`  ${step.file}`);
    await cdp.send('Target.closeTarget', { targetId: page.targetId });
  }

  cdp.close();
  child.kill();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
  console.log(`\nScreenshots written to ${SHOTS}`);
  return 0;
}

/* -------------------------------------------------------------------- main --- */

const command = process.argv[2] || 'verify';
const exitCode = command === 'shots' ? await shots() : await verify();
process.exit(exitCode);
