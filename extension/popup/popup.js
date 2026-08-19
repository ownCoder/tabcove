/**
 * Tabcove — popup.
 *
 * One job: capture, in under two seconds, with the user knowing exactly what
 * they are about to do. Every button carries a live count, because a button
 * labelled "Stow all tabs · 24 tabs · 3 groups" is a contract and one labelled
 * "Stow all tabs" is only a promise.
 *
 * The popup reads storage directly rather than messaging the service worker.
 * Under MV3 the worker is usually asleep, and paying a cold start on a click is
 * exactly the kind of latency users read as "this extension is slow".
 */

import * as db from '../lib/db.js';
import * as capture from '../lib/capture.js';
import * as restore from '../lib/restore.js';
import { getSettings, applyAppearance } from '../lib/settings.js';
import { exportLibrary } from '../lib/exporter.js';
import { $, $$, el, icon, iconButton, downloadBlob } from '../lib/dom.js';
import { relativeTime, plural, formatNumber } from '../lib/format.js';
import { toast, success, guard } from '../lib/toast.js';

const SCOPE = capture.SCOPE;

/* ----------------------------------------------------------------- startup --- */

async function main() {
  const settings = await getSettings();
  applyAppearance(document, settings);

  paintHeaderIcons();
  wireActions();

  // Fire the three independent loads together — the popup should feel instant.
  await Promise.all([paintCounts(), paintRecent(), paintFooter()]);
  await paintBackupNotice();
}

function paintHeaderIcons() {
  $('#open-options').appendChild(icon('settings', { size: 16 }));
  $('#open-library').appendChild(icon('library', { size: 16 }));
}

/* ------------------------------------------------------------------ counts --- */

/**
 * Fill every button with what it would actually capture.
 * Scopes that would do nothing are hidden rather than disabled: an always-grey
 * button is visual noise that never becomes useful.
 */
async function paintCounts() {
  const [current, others, selected, allWindows] = await Promise.all([
    capture.preview(SCOPE.CURRENT_WINDOW),
    capture.preview(SCOPE.OTHER_TABS),
    capture.preview(SCOPE.SELECTED),
    capture.preview(SCOPE.ALL_WINDOWS),
  ]);

  const primary = $('#stow-all');
  const primaryMeta = $('#stow-all-meta');

  if (current.tabs === 0) {
    primary.disabled = true;
    $('.stow-primary__label', primary).textContent = 'Nothing to stow';
    primaryMeta.textContent = current.keptPinned
      ? 'Only this page, pinned tabs, or excluded pages are open'
      : 'Only this page is open';
  } else {
    primaryMeta.textContent = [
      plural(current.tabs, 'tab'),
      current.groups ? plural(current.groups, 'group') : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  setOption('otherTabs', others.tabs, others.groups);

  // Only shown when the user has actually multi-selected tabs.
  const selectedButton = $('[data-scope="selected"]');
  if (selected.tabs > 1) {
    selectedButton.hidden = false;
    setOption('selected', selected.tabs, selected.groups);
  }

  // Only shown when there really is more than one window.
  const allWindowsButton = $('[data-scope="allWindows"]');
  if (allWindows.windows > 1) {
    allWindowsButton.hidden = false;
    $('[data-meta="allWindows"]').textContent = `${plural(allWindows.tabs, 'tab')} · ${plural(
      allWindows.windows,
      'window'
    )}`;
  }
}

function setOption(scope, tabs, groups) {
  const button = $(`[data-scope="${scope}"]`);
  const meta = $(`[data-meta="${scope}"]`);
  if (!button || !meta) return;

  if (tabs === 0) {
    button.disabled = true;
    meta.textContent = 'Nothing to stow';
  } else {
    meta.textContent = [plural(tabs, 'tab'), groups ? plural(groups, 'group') : null]
      .filter(Boolean)
      .join(' · ');
  }
}

/* ------------------------------------------------------------------ recent --- */

async function paintRecent() {
  const index = await db.getIndex();
  const list = $('#recent-list');
  list.replaceChildren();

  if (!index.length) {
    list.appendChild(
      el('li', {
        className: 'recent-list__empty',
        text: 'Nothing stowed yet. Your saved tabs will appear here.',
      })
    );
    return;
  }

  const recent = [...index]
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 5);

  for (const entry of recent) {
    const item = el('li', {}, [
      el(
        'button',
        {
          className: 'recent-item',
          attrs: {
            type: 'button',
            title: `${entry.title} — open in the library`,
          },
          on: { click: () => openLibrary(entry.id) },
        },
        [
          el('span', { className: 'recent-item__title', text: entry.title }),
          el('span', { className: 'recent-item__count', text: formatNumber(entry.count) }),
          el('span', { className: 'recent-item__time', text: relativeTime(entry.updatedAt) }),
        ]
      ),
    ]);

    // Restore straight from the popup — the fastest path back to your tabs.
    const restoreButton = iconButton(
      'restore',
      `Restore ${entry.title}`,
      async (event) => {
        event.stopPropagation();
        await restoreCollection(entry.id, entry.title);
      },
      { className: 'icon-btn--sm recent-item__restore', size: 14 }
    );
    $('.recent-item', item).appendChild(restoreButton);

    list.appendChild(item);
  }
}

/* ------------------------------------------------------------------ footer --- */

async function paintFooter() {
  const stats = await db.getStats();
  $('#library-stats').textContent = stats.collections
    ? `${plural(stats.tabs, 'tab')} in ${plural(stats.collections, 'collection')}`
    : 'Your library is empty';
}

/**
 * The backup nudge.
 *
 * Deliberately quiet, dismissible, and honest: local storage is not forever, and
 * the product that says so is the product you can trust with the data.
 */
async function paintBackupNotice() {
  const [settings, meta, stats] = await Promise.all([getSettings(), db.getMeta(), db.getStats()]);
  if (!settings.backupReminder || !stats.tabs) return;

  const since = stats.tabs - (meta.lastBackupCount || 0);
  if (since < settings.backupReminderThreshold) return;

  const notice = $('#backup-notice');
  $('#backup-notice-text').textContent = meta.lastBackupAt
    ? 'Your library has grown since your last backup.'
    : "You haven't backed up yet.";
  $('#backup-notice-detail').textContent = `${plural(since, 'tab')} added${
    meta.lastBackupAt ? ` since ${relativeTime(meta.lastBackupAt)}` : ''
  }.`;
  notice.hidden = false;

  $('#backup-now').addEventListener('click', () =>
    guard(async () => {
      const payload = await exportLibrary('json');
      downloadBlob(payload.filename, payload.content, payload.mime);
      await db.setMeta({ lastBackupAt: Date.now(), lastBackupCount: stats.tabs });
      notice.hidden = true;
      success('Backup saved', { detail: `${plural(payload.stats.tabs, 'tab')} exported` });
      chrome.runtime.sendMessage({ type: 'refresh-badge' }, () => void chrome.runtime.lastError);
    }, 'The backup could not be saved.')
  );
}

/* ----------------------------------------------------------------- actions --- */

function wireActions() {
  $('#stow-all').addEventListener('click', () => stow(SCOPE.CURRENT_WINDOW));

  for (const button of $$('[data-scope]')) {
    button.addEventListener('click', () => stow(button.dataset.scope));
  }

  $('#open-library').addEventListener('click', () => openLibrary());
  $('#footer-library').addEventListener('click', () => openLibrary());
  $('#open-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

async function stow(scope) {
  await guard(async () => {
    await db.init();
    const result = await capture.capture(scope);

    if (result.empty) {
      toast('Nothing to stow', {
        variant: 'warn',
        detail: 'Every open tab is pinned or excluded by your settings.',
      });
      return;
    }

    // The library opens on the new collection so the user sees where the tabs
    // went. "Where did my tabs go?" is the loudest complaint in this category.
    await openLibrary(result.collection.id);
  }, 'Those tabs could not be stowed.');
}

async function restoreCollection(id, title) {
  await guard(async () => {
    const result = await restore.restoreCollection(id);
    const detail = result.skipped.length
      ? `${result.skipped.length} could not be reopened by Chrome`
      : result.groupsRestored
        ? `${plural(result.groupsRestored, 'group')} rebuilt`
        : null;
    success(`${plural(result.opened, 'tab')} restored`, { detail });
    window.close();
  }, `${title} could not be restored.`);
}

function openLibrary(focusId = null) {
  const base = chrome.runtime.getURL('library/library.html');
  const url = focusId ? `${base}?focus=${encodeURIComponent(focusId)}` : base;

  chrome.tabs.query({ url: `${base}*` }, (tabs) => {
    void chrome.runtime.lastError;
    if (tabs && tabs.length) {
      chrome.tabs.update(tabs[0].id, { url, active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      chrome.tabs.create({ url, active: true });
    }
    window.close();
  });
}

/* -------------------------------------------------------------------- boot --- */

main().catch((error) => {
  // A popup that renders a blank rectangle is worse than one that admits failure.
  document.body.replaceChildren(
    el('div', { className: 'empty' }, [
      el('div', { className: 'empty__title', text: 'Tabcove could not start' }),
      el('div', { className: 'empty__desc', text: error?.message || String(error) }),
    ])
  );
});
