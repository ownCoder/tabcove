/**
 * Tabcove — service worker.
 *
 * Under Manifest V3 this worker is killed aggressively (roughly 30 s idle), so
 * it deliberately owns as little as possible. It holds NO state. Everything the
 * UI needs it reads from storage itself, which is why a click in the popup never
 * pays a worker cold-start.
 *
 * The worker handles only what genuinely must be global:
 *   - install / update housekeeping and the welcome page
 *   - keyboard commands
 *   - context menus
 *   - alarms (bin sweep, backup reminder)
 */

import * as db from '../lib/db.js';
import * as trash from '../lib/trash.js';
import * as capture from '../lib/capture.js';
import { getSettings } from '../lib/settings.js';
import { ALARM, APP_VERSION } from '../lib/constants.js';

/* --------------------------------------------------------------- install --- */

chrome.runtime.onInstalled.addListener(async (details) => {
  // Migrations are snapshot-protected and idempotent — safe on every path.
  await db.init().catch(() => {});

  buildContextMenus();
  scheduleAlarms();

  if (details.reason === 'install') {
    await chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') });
  } else if (details.reason === 'update') {
    // No "what's new" tab on update. Interrupting someone's browsing to show a
    // changelog is the kind of thing that earns one-star reviews.
    const previous = details.previousVersion || '';
    if (previous !== APP_VERSION) {
      await db.setMeta({ lastUpgradeFrom: previous, lastUpgradeAt: Date.now() }).catch(() => {});
    }
  }
});

// The worker can be revived without onInstalled firing, so re-establish the
// things that live outside storage.
chrome.runtime.onStartup.addListener(async () => {
  await db.init().catch(() => {});
  buildContextMenus();
  scheduleAlarms();
});

/* ---------------------------------------------------------------- alarms --- */

function scheduleAlarms() {
  // MV3 kills setTimeout with the worker, so housekeeping has to be an alarm.
  chrome.alarms.create(ALARM.TRASH_SWEEP, { periodInMinutes: 60 * 12, delayInMinutes: 5 });
  chrome.alarms.create(ALARM.BACKUP_CHECK, { periodInMinutes: 60 * 24, delayInMinutes: 30 });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    if (alarm.name === ALARM.TRASH_SWEEP) {
      const settings = await getSettings();
      await trash.sweep(settings.trashDays);
    } else if (alarm.name === ALARM.BACKUP_CHECK) {
      await updateBackupBadge();
    }
  } catch {
    /* housekeeping must never throw into the worker's global scope */
  }
});

/**
 * A quiet badge when the library has grown well past the last backup.
 *
 * Deliberately restrained: a dot, not a number, and only when the user has left
 * the reminder switched on. The reminder that nags is the reminder that gets
 * the extension uninstalled.
 */
async function updateBackupBadge() {
  const settings = await getSettings();
  if (!settings.backupReminder) {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }

  const [meta, stats] = await Promise.all([db.getMeta(), db.getStats()]);
  const since = stats.tabs - (meta.lastBackupCount || 0);

  if (since >= settings.backupReminderThreshold) {
    await chrome.action.setBadgeText({ text: '•' });
    await chrome.action.setBadgeBackgroundColor({ color: '#F2A33C' });
    await chrome.action.setTitle({
      title: `Tabcove — ${since} tabs saved since your last backup`,
    });
  } else {
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: 'Tabcove — stow your tabs' });
  }
}

/* -------------------------------------------------------------- commands --- */

chrome.commands.onCommand.addListener(async (command) => {
  try {
    switch (command) {
      case 'stow-all':
        await stow(capture.SCOPE.CURRENT_WINDOW);
        break;
      case 'stow-current':
        await stow(capture.SCOPE.CURRENT_TAB);
        break;
      case 'open-library':
        await openLibrary();
        break;
      default:
        break;
    }
  } catch (e) {
    await notifyFailure(e);
  }
});

/* ---------------------------------------------------------- context menus --- */

function buildContextMenus() {
  // removeAll first, otherwise a worker restart duplicates every entry.
  chrome.contextMenus.removeAll(() => {
    void chrome.runtime.lastError;

    const menus = [
      { id: 'tc-stow-all', title: 'Stow all tabs in this window' },
      { id: 'tc-stow-current', title: 'Stow just this tab' },
      { id: 'tc-stow-others', title: 'Stow every other tab' },
      { id: 'tc-separator', type: 'separator' },
      { id: 'tc-open-library', title: 'Open Tabcove library' },
    ];

    for (const item of menus) {
      chrome.contextMenus.create({ contexts: ['page', 'action'], ...item }, () => {
        void chrome.runtime.lastError;
      });
    }
  });
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  try {
    switch (info.menuItemId) {
      case 'tc-stow-all':
        await stow(capture.SCOPE.CURRENT_WINDOW);
        break;
      case 'tc-stow-current':
        await stow(capture.SCOPE.CURRENT_TAB);
        break;
      case 'tc-stow-others':
        await stow(capture.SCOPE.OTHER_TABS);
        break;
      case 'tc-open-library':
        await openLibrary();
        break;
      default:
        break;
    }
  } catch (e) {
    await notifyFailure(e);
  }
});

/* --------------------------------------------------------------- actions --- */

/**
 * Stow, then open the library focused on what was just saved.
 *
 * The library is opened so the user immediately sees where their tabs went. The
 * single most common complaint about tools in this category is "where did my
 * tabs go?", and the cheapest fix is to show them.
 */
async function stow(scope) {
  await db.init();
  const result = await capture.capture(scope);

  if (result.empty) {
    await flashBadge('—', '#5A6B6F');
    return;
  }

  await openLibrary(result.collection.id);
  await flashBadge(String(result.collection.tabs.length), '#0E7C86');
  await updateBackupBadge();
}

/** Focus an existing library tab rather than opening a second one. */
async function openLibrary(focusId = null) {
  const base = chrome.runtime.getURL('library/library.html');
  const url = focusId ? `${base}?focus=${encodeURIComponent(focusId)}` : base;

  const existing = await chrome.tabs.query({ url: `${base}*` });
  if (existing.length) {
    const tab = existing[0];
    await chrome.tabs.update(tab.id, { url, active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
    return tab;
  }
  return chrome.tabs.create({ url, active: true });
}

/** A brief count on the toolbar icon, so a keyboard stow gives visible feedback. */
async function flashBadge(text, color) {
  try {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
    // The worker may die before this fires; the badge is restored by the daily
    // alarm and by the next stow, so a missed clear is cosmetic and self-healing.
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' }, () => void chrome.runtime.lastError);
      updateBackupBadge().catch(() => {});
    }, 2500);
  } catch {
    /* badges are decoration; never let one break a stow */
  }
}

/**
 * Surface a failure without the `notifications` permission.
 *
 * A red badge plus a tooltip is a deliberate trade: one more permission on the
 * install dialogue costs more installs than a system notification is worth.
 */
async function notifyFailure(error) {
  try {
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#C22B2B' });
    await chrome.action.setTitle({
      title: `Tabcove — ${error?.message || 'that action did not work'}`,
    });
  } catch {
    /* nothing further we can do */
  }
}

/* -------------------------------------------------------------- messaging --- */

/**
 * The UI talks to storage directly, so this exists only for the few things that
 * genuinely need the worker's privileges or its cross-surface view.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      switch (message?.type) {
        case 'stow':
          sendResponse({ ok: true, result: await capture.capture(message.scope) });
          break;
        case 'open-library':
          await openLibrary(message.focusId);
          sendResponse({ ok: true });
          break;
        case 'refresh-badge':
          await updateBackupBadge();
          sendResponse({ ok: true });
          break;
        case 'sweep-trash': {
          const settings = await getSettings();
          sendResponse({ ok: true, swept: await trash.sweep(settings.trashDays) });
          break;
        }
        default:
          sendResponse({ ok: false, reason: 'unknown-message' });
      }
    } catch (e) {
      sendResponse({ ok: false, reason: e?.message || String(e) });
    }
  })();

  return true; // keep the channel open for the async response
});
