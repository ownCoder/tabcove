/**
 * Tabcove — reading open tabs into a collection.
 *
 * The one rule that matters here: THE WRITE COMPLETES BEFORE ANY TAB CLOSES.
 * `chrome.tabs.remove` is only ever called after `db.createCollection` resolves.
 * A failed write therefore costs the user nothing — which is the precise
 * inversion of the failure mode that defines this category.
 */

import * as db from './db.js';
import { getSettings } from './settings.js';
import { EXCLUDED_SCHEMES, GROUP_COLORS } from './constants.js';
import { defaultCollectionTitle } from './format.js';

/** Capture scopes the UI can ask for. */
export const SCOPE = {
  CURRENT_WINDOW: 'currentWindow',
  CURRENT_TAB: 'currentTab',
  OTHER_TABS: 'otherTabs',
  SELECTED: 'selected',
  ALL_WINDOWS: 'allWindows',
};

/* ------------------------------------------------------------ chrome glue --- */

function tabsQuery(query) {
  return new Promise((resolve) => {
    chrome.tabs.query(query, (tabs) => {
      if (chrome.runtime.lastError) return resolve([]);
      resolve(tabs || []);
    });
  });
}

function groupsQuery(query) {
  return new Promise((resolve) => {
    if (!chrome.tabGroups) return resolve([]);
    chrome.tabGroups.query(query, (groups) => {
      if (chrome.runtime.lastError) return resolve([]);
      resolve(groups || []);
    });
  });
}

function tabsRemove(ids) {
  return new Promise((resolve) => {
    if (!ids.length) return resolve();
    chrome.tabs.remove(ids, () => {
      // A tab that vanished before we got to it is not an error worth surfacing.
      void chrome.runtime.lastError;
      resolve();
    });
  });
}

/* ------------------------------------------------------------- filtering --- */

/** Is this a tab we are willing to put in an archive? */
export function isCapturable(tab, settings) {
  if (!tab || !tab.url) return false;

  let scheme;
  try {
    scheme = new URL(tab.url).protocol;
  } catch {
    return false;
  }

  if (scheme === 'file:') return !!settings.allowFileUrls;
  if (settings.skipExcluded && EXCLUDED_SCHEMES.includes(scheme)) return false;

  // Never archive our own pages — restoring them would be a loop.
  if (tab.url.startsWith(chrome.runtime.getURL(''))) return false;

  if (tab.pinned && settings.keepPinnedOpen) return false;

  return true;
}

/**
 * What a scope would capture, without capturing it.
 * The popup calls this so its buttons can carry real counts — a button that
 * says "Stow all tabs · 24 tabs · 3 groups" is a contract, not a promise.
 */
export async function preview(scope = SCOPE.CURRENT_WINDOW) {
  const settings = await getSettings();
  const tabs = await tabsForScope(scope, settings);

  const groupIds = new Set(
    tabs.map((t) => t.groupId).filter((id) => Number.isInteger(id) && id > -1)
  );

  const windows = new Set(tabs.map((t) => t.windowId));

  return {
    tabs: tabs.length,
    groups: groupIds.size,
    windows: windows.size,
    // Pinned tabs we are deliberately leaving open, so the UI can say so.
    keptPinned: settings.keepPinnedOpen,
  };
}

/** The raw Chrome tabs a scope resolves to, after filtering. */
async function tabsForScope(scope, settings) {
  let raw = [];

  switch (scope) {
    case SCOPE.CURRENT_TAB:
      raw = await tabsQuery({ active: true, currentWindow: true });
      break;

    case SCOPE.OTHER_TABS: {
      const all = await tabsQuery({ currentWindow: true });
      raw = all.filter((t) => !t.active);
      break;
    }

    case SCOPE.SELECTED:
      raw = await tabsQuery({ highlighted: true, currentWindow: true });
      break;

    case SCOPE.ALL_WINDOWS:
      raw = await tabsQuery({ windowType: 'normal' });
      break;

    case SCOPE.CURRENT_WINDOW:
    default:
      raw = await tabsQuery({ currentWindow: true, windowType: 'normal' });
      break;
  }

  return raw.filter((t) => isCapturable(t, settings));
}

/* --------------------------------------------------------------- capture --- */

/**
 * Capture a scope into a new collection.
 *
 * @returns {Promise<{collection, closed:number, skipped:number}>}
 *          or `{ empty: true }` when there was nothing to take.
 */
export async function capture(scope = SCOPE.CURRENT_WINDOW, { title = null } = {}) {
  const settings = await getSettings();
  const tabs = await tabsForScope(scope, settings);

  if (!tabs.length) return { empty: true, reason: 'nothing-to-stow' };

  // Window ids are per-session, so map them to stable 0-based indexes.
  const windowOrder = [...new Set(tabs.map((t) => t.windowId))];
  const windowIndexOf = new Map(windowOrder.map((id, i) => [id, i]));

  // One tabGroups query per window, not per tab.
  const groupMeta = new Map(); // chrome groupId -> {title, color, collapsed}
  for (const windowId of windowOrder) {
    for (const g of await groupsQuery({ windowId })) {
      groupMeta.set(g.id, {
        title: g.title || '',
        color: GROUP_COLORS.includes(g.color) ? g.color : 'grey',
        collapsed: !!g.collapsed,
      });
    }
  }

  // Chrome group ids are meaningless after a restart. Store an index into our
  // own groups array instead — this is the difference between a group that
  // survives a browser restart and one that does not.
  const groups = [];
  const groupIndexOf = new Map();
  for (const [chromeId, meta] of groupMeta) {
    if (!tabs.some((t) => t.groupId === chromeId)) continue; // unused group
    groupIndexOf.set(chromeId, groups.push(meta) - 1);
  }

  const now = Date.now();
  const captured = tabs.map((t) => ({
    url: t.url,
    title: t.title || t.url,
    pinned: !!t.pinned,
    groupId: groupIndexOf.has(t.groupId) ? groupIndexOf.get(t.groupId) : -1,
    windowIx: windowIndexOf.get(t.windowId) || 0,
    savedAt: now,
  }));

  const collection = await db.createCollection(
    {
      title: title || defaultCollectionTitle(captured, settings.defaultTitleStyle),
      tabs: captured,
      groups,
      windows: windowOrder.length,
      createdAt: now,
    },
    { allowFileUrls: settings.allowFileUrls }
  );

  // Only now — after the write resolved — is it safe to close anything.
  let closed = 0;
  if (settings.closeAfterStow) {
    const ids = tabs.map((t) => t.id).filter(Number.isInteger);
    await ensureSurvivingTab(tabs);
    await tabsRemove(ids);
    closed = ids.length;
  }

  return {
    collection,
    closed,
    skipped: 0,
    groups: groups.length,
  };
}

/**
 * Closing every tab in a window closes the window. Open the library first so the
 * user lands somewhere useful instead of watching Chrome disappear.
 */
async function ensureSurvivingTab(closing) {
  const windowIds = [...new Set(closing.map((t) => t.windowId))];

  for (const windowId of windowIds) {
    const inWindow = await tabsQuery({ windowId });
    const closingIds = new Set(closing.filter((t) => t.windowId === windowId).map((t) => t.id));
    const survivors = inWindow.filter((t) => !closingIds.has(t.id));

    if (survivors.length === 0) {
      await new Promise((resolve) => {
        chrome.tabs.create(
          { windowId, url: chrome.runtime.getURL('library/library.html'), active: true },
          () => {
            void chrome.runtime.lastError;
            resolve();
          }
        );
      });
    }
  }
}

/** Add the current scope's tabs to an existing collection instead of a new one. */
export async function captureInto(collectionId, scope = SCOPE.CURRENT_WINDOW) {
  const settings = await getSettings();
  const tabs = await tabsForScope(scope, settings);
  if (!tabs.length) return { empty: true };

  const existing = await db.getCollection(collectionId);
  if (!existing) throw new Error('That collection no longer exists.');

  const now = Date.now();
  const groupMeta = new Map();
  for (const windowId of new Set(tabs.map((t) => t.windowId))) {
    for (const g of await groupsQuery({ windowId })) {
      groupMeta.set(g.id, {
        title: g.title || '',
        color: GROUP_COLORS.includes(g.color) ? g.color : 'grey',
        collapsed: !!g.collapsed,
      });
    }
  }

  // Reuse a matching group in the target rather than creating a duplicate.
  const groupIndexOf = new Map();
  for (const [chromeId, meta] of groupMeta) {
    if (!tabs.some((t) => t.groupId === chromeId)) continue;
    let at = existing.groups.findIndex((g) => g.title === meta.title && g.color === meta.color);
    if (at < 0) at = existing.groups.push(meta) - 1;
    groupIndexOf.set(chromeId, at);
  }

  existing.tabs.push(
    ...tabs.map((t) => ({
      url: t.url,
      title: t.title || t.url,
      pinned: !!t.pinned,
      groupId: groupIndexOf.has(t.groupId) ? groupIndexOf.get(t.groupId) : -1,
      windowIx: 0,
      savedAt: now,
    }))
  );

  const updated = await db.updateCollection(collectionId, existing);

  let closed = 0;
  if (settings.closeAfterStow) {
    const ids = tabs.map((t) => t.id).filter(Number.isInteger);
    await ensureSurvivingTab(tabs);
    await tabsRemove(ids);
    closed = ids.length;
  }

  return { collection: updated, closed, added: tabs.length };
}
