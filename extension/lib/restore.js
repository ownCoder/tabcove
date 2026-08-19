/**
 * Tabcove — reopening a saved collection.
 *
 * Two things make this different from the obvious implementation:
 *
 *   1. RESTORE IS NON-DESTRUCTIVE BY DEFAULT. Opening a collection does not
 *      consume it. A library you empty by reading from it is not a library.
 *
 *   2. TABS OPEN IN BATCHES. Creating 200 tabs in a tight loop stalls Chrome
 *      hard. Batching with a yield keeps the browser responsive and makes the
 *      operation cancellable.
 */

import * as db from './db.js';
import { getSettings } from './settings.js';
import { RESTORABLE_SCHEMES, GROUP_COLORS } from './constants.js';

/* ------------------------------------------------------------ chrome glue --- */

function createTab(props) {
  return new Promise((resolve) => {
    chrome.tabs.create(props, (tab) => {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(tab || null);
    });
  });
}

function createWindow(props) {
  return new Promise((resolve) => {
    chrome.windows.create(props, (win) => {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(win || null);
    });
  });
}

function groupTabs(props) {
  return new Promise((resolve) => {
    chrome.tabs.group(props, (groupId) => {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(groupId);
    });
  });
}

function updateGroup(groupId, props) {
  return new Promise((resolve) => {
    if (!chrome.tabGroups) return resolve();
    chrome.tabGroups.update(groupId, props, () => {
      void chrome.runtime.lastError;
      resolve();
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------- filtering --- */

/** Chrome refuses to open some schemes from an extension. Know that up front. */
export function isRestorable(url) {
  try {
    const u = new URL(url);
    if (!RESTORABLE_SCHEMES.includes(u.protocol)) return false;
    // The Web Store is specifically blocked for extension-initiated navigation.
    if (/(^|\.)chrome\.google\.com$/.test(u.hostname) && u.pathname.startsWith('/webstore')) {
      return false;
    }
    if (/(^|\.)chromewebstore\.google\.com$/.test(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Why a tab could not be reopened, phrased for a human. */
function blockReason(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'file:') return 'Chrome blocks extensions from opening local files';
    if (!RESTORABLE_SCHEMES.includes(u.protocol)) return `Chrome blocks ${u.protocol}// pages`;
    return 'Chrome blocks extensions from opening Web Store pages';
  } catch {
    return 'Not a valid address';
  }
}

/* --------------------------------------------------------------- restore --- */

/**
 * Reopen a collection.
 *
 * @param {string} collectionId
 * @param {Object} options
 *   - newWindow  {boolean}  force a new window regardless of the saved layout
 *   - consume    {boolean}  delete the collection afterwards (default: settings)
 *   - onProgress {Function} ({done, total}) => void
 *   - signal     {AbortSignal} to cancel mid-flight
 */
export async function restoreCollection(collectionId, options = {}) {
  const collection = await db.getCollection(collectionId);
  if (!collection) throw new Error('That collection no longer exists.');
  return restoreTabs(collection, { ...options, collectionId });
}

/** Reopen a specific subset of a collection's tabs. */
export async function restoreSome(collectionId, tabIndexes, options = {}) {
  const collection = await db.getCollection(collectionId);
  if (!collection) throw new Error('That collection no longer exists.');

  const wanted = new Set(tabIndexes);
  const subset = {
    ...collection,
    tabs: collection.tabs.filter((_, i) => wanted.has(i)),
  };
  return restoreTabs(subset, { ...options, collectionId, consume: false });
}

/** Open one saved tab. The most common single action in the product. */
export async function restoreOne(url, { active = false } = {}) {
  if (!isRestorable(url)) {
    return { opened: 0, skipped: [{ url, reason: blockReason(url) }] };
  }
  const tab = await createTab({ url, active });
  return { opened: tab ? 1 : 0, skipped: [] };
}

/**
 * The engine. Works from a collection-shaped object, so it serves both a stored
 * collection and an ad-hoc subset without a second code path.
 */
async function restoreTabs(collection, options = {}) {
  const settings = await getSettings();

  const newWindow = options.newWindow ?? settings.restoreInNewWindow;
  const consume = options.consume ?? settings.consumeOnRestore;
  const withGroups = settings.restoreGroups && !!chrome.tabGroups;
  const withPinned = settings.restorePinned;
  const batchSize = Math.max(1, Math.min(32, settings.batchSize || 8));
  const onProgress = options.onProgress || (() => {});
  const signal = options.signal;

  const openable = [];
  const skipped = [];
  for (const tab of collection.tabs) {
    if (isRestorable(tab.url)) openable.push(tab);
    else skipped.push({ url: tab.url, title: tab.title, reason: blockReason(tab.url) });
  }

  if (!openable.length) {
    return { opened: 0, skipped, cancelled: false, groupsRestored: 0 };
  }

  // Preserve the saved multi-window layout unless the user overrode it.
  const byWindow = new Map();
  for (const tab of openable) {
    const key = newWindow ? 0 : tab.windowIx || 0;
    if (!byWindow.has(key)) byWindow.set(key, []);
    byWindow.get(key).push(tab);
  }

  let opened = 0;
  let groupsRestored = 0;
  let cancelled = false;
  const total = openable.length;

  for (const [, tabsForWindow] of byWindow) {
    if (signal?.aborted) {
      cancelled = true;
      break;
    }

    let windowId;
    let startAt = 0;

    if (newWindow || byWindow.size > 1) {
      // Seed the window with the first tab so we never flash a New Tab page.
      const [seed, ...rest] = tabsForWindow;
      const win = await createWindow({ url: seed.url, focused: true });
      if (!win) continue;
      windowId = win.id;
      opened++;
      onProgress({ done: opened, total });

      // Chrome ignores `pinned` in windows.create, so pin the seed afterwards.
      if (withPinned && seed.pinned && win.tabs?.[0]) {
        chrome.tabs.update(win.tabs[0].id, { pinned: true }, () => void chrome.runtime.lastError);
      }
      seed._chromeTabId = win.tabs?.[0]?.id ?? null;
      tabsForWindow.length = 0;
      tabsForWindow.push(seed, ...rest);
      startAt = 1; // the seed tab is already open
    } else {
      windowId = undefined; // reuse the current window
    }

    for (let i = startAt; i < tabsForWindow.length; i += batchSize) {
      if (signal?.aborted) {
        cancelled = true;
        break;
      }

      const batch = tabsForWindow.slice(i, i + batchSize);
      const created = await Promise.all(
        batch.map((tab) =>
          createTab({
            url: tab.url,
            active: false,
            pinned: withPinned && tab.pinned,
            ...(windowId ? { windowId } : {}),
          }).then((chromeTab) => {
            tab._chromeTabId = chromeTab?.id ?? null;
            return chromeTab;
          })
        )
      );

      opened += created.filter(Boolean).length;
      onProgress({ done: opened, total });

      // Yield so Chrome can paint and the user can cancel.
      if (i + batchSize < tabsForWindow.length) await sleep(40);
    }

    if (withGroups && !cancelled) {
      groupsRestored += await regroup(tabsForWindow, collection.groups || [], windowId);
    }
  }

  if (consume && !cancelled && options.collectionId) {
    await db.deleteCollection(options.collectionId, { force: true });
  }

  return { opened, skipped, cancelled, groupsRestored };
}

/**
 * Rebuild Chrome tab groups with their original names and colours.
 * This is the round-trip fidelity the reference product does not have.
 */
async function regroup(tabs, groups, windowId) {
  const byGroup = new Map();
  for (const tab of tabs) {
    if (!Number.isInteger(tab.groupId) || tab.groupId < 0) continue;
    if (!tab._chromeTabId) continue;
    if (!byGroup.has(tab.groupId)) byGroup.set(tab.groupId, []);
    byGroup.get(tab.groupId).push(tab._chromeTabId);
  }

  let restored = 0;
  for (const [groupIx, tabIds] of byGroup) {
    const meta = groups[groupIx];
    if (!meta || !tabIds.length) continue;

    const groupId = await groupTabs({
      tabIds,
      ...(windowId ? { createProperties: { windowId } } : {}),
    });
    if (groupId === null || groupId === undefined) continue;

    await updateGroup(groupId, {
      title: meta.title || '',
      color: GROUP_COLORS.includes(meta.color) ? meta.color : 'grey',
      collapsed: !!meta.collapsed,
    });
    restored++;
  }

  return restored;
}
