/**
 * Tabcove — options.
 *
 * Settings bind declaratively: any control carrying `data-setting="key"` is
 * wired automatically from DEFAULT_SETTINGS. Adding a setting means adding one
 * entry to constants.js and one control to options.html — never a third place
 * to forget.
 */

import * as db from '../lib/db.js';
import * as trash from '../lib/trash.js';
import * as snapshots from '../lib/snapshots.js';
import * as storage from '../lib/storage.js';
import * as importer from '../lib/importer.js';
import { exportLibrary } from '../lib/exporter.js';
import { getSettings, setSettings, resetSettings, applyAppearance } from '../lib/settings.js';
import { $, $$, el, downloadBlob, readFileAsText, trapFocus } from '../lib/dom.js';
import { relativeTime, plural, formatNumber, bytes } from '../lib/format.js';
import { success, warn, guard } from '../lib/toast.js';
import { APP_VERSION, QUOTA, SNAPSHOT_REASON } from '../lib/constants.js';
import { getLicense } from '../lib/license.js';
import { all as allFlags } from '../lib/flags.js';

let settings = null;
let pendingImport = null;

/* ----------------------------------------------------------------- startup --- */

async function main() {
  settings = await getSettings();
  applyAppearance(document, settings);
  await db.init();

  $('#version-badge').textContent = `v${APP_VERSION}`;
  $('#about-version').textContent = APP_VERSION;

  await paintTier();
  bindSettings();
  wireBackup();
  wireImport();
  wireMaintenance();
  wireAbout();
  wireDangerZone();

  await paintStats();
}

/* -------------------------------------------------------------------- tier --- */

/**
 * Render the licence tier.
 *
 * This is the only consumer of lib/license.js and lib/flags.js in v1, and it
 * exists so that the Pro seam is LIVE rather than dead code sitting unreachable
 * inside a shipped package. A reviewer reading the source finds a licence module
 * that something actually calls, and the answer it gives today is "free".
 */
async function paintTier() {
  const [license, flags] = await Promise.all([getLicense(), allFlags()]);
  const gated = Object.values(flags).filter((open) => !open).length;

  const badge = $('#tier-badge');
  if (badge) badge.textContent = license.tier === 'pro' ? 'Pro' : 'Free';

  const note = $('#tier-note');
  if (note) {
    note.textContent =
      license.tier === 'pro'
        ? 'Pro is active on this device.'
        : `Every one of Tabcove's features is available to you right now. ${gated} capabilities are reserved for a future Pro version that does not exist yet — none of them is something you can use today.`;
  }
}

/* ---------------------------------------------------------------- bindings --- */

/** Two-way binding for every `data-setting` control on the page. */
function bindSettings() {
  for (const control of $$('[data-setting]')) {
    const key = control.dataset.setting;
    const value = settings[key];

    if (control.type === 'checkbox') control.checked = !!value;
    else control.value = String(value);

    control.addEventListener('change', () =>
      guard(async () => {
        let next;
        if (control.type === 'checkbox') next = control.checked;
        else if (control.type === 'number') {
          const n = Number(control.value);
          // Respect the min/max the markup already declares rather than
          // duplicating the range in JS.
          const min = Number(control.min || -Infinity);
          const max = Number(control.max || Infinity);
          next = Math.min(max, Math.max(min, Number.isFinite(n) ? n : settings[key]));
          control.value = String(next);
        } else next = control.value;

        settings = await setSettings({ [key]: next });
        applyAppearance(document, settings);
        await paintStats();
      }, 'That setting did not save.')
    );
  }
}

/* ------------------------------------------------------------------ backup --- */

function wireBackup() {
  for (const button of $$('[data-export]')) {
    button.addEventListener('click', () =>
      guard(async () => {
        const format = button.dataset.export;
        const payload = await exportLibrary(format);

        if (!payload.stats.tabs) {
          warn('Nothing to export', { detail: 'Your library is empty.' });
          return;
        }

        downloadBlob(payload.filename, payload.content, payload.mime);

        // Only a complete JSON export counts as a backup, because only a
        // complete JSON export can be re-imported losslessly.
        if (format === 'json') {
          const stats = await db.getStats();
          await db.setMeta({ lastBackupAt: Date.now(), lastBackupCount: stats.tabs });
          chrome.runtime.sendMessage({ type: 'refresh-badge' }, () => void chrome.runtime.lastError);
        }

        success(`Exported ${plural(payload.stats.tabs, 'tab')}`, { detail: payload.filename });
        await paintStats();
      }, 'That export could not be created.')
    );
  }
}

/* ------------------------------------------------------------------ import --- */

function wireImport() {
  const textarea = $('#import-text');
  const fileInput = $('#file-input');

  $('#pick-file').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () =>
    guard(async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      $('#file-name').textContent = file.name;
      textarea.value = await readFileAsText(file);
      previewImport();
    }, 'That file could not be read.')
  );

  textarea.addEventListener('input', previewImport);

  $('#import-add').addEventListener('click', () => runImport('add'));
  $('#import-replace').addEventListener('click', () => confirmReplaceImport());
}

/**
 * Parse without writing, so the user sees exactly what they are about to do.
 * Import is the operation people attempt when they are already anxious about
 * their data; a preview is the cheapest way to lower the stakes.
 */
function previewImport() {
  const text = $('#import-text').value;
  const notice = $('#import-preview');
  const message = $('#import-preview-text');

  if (!text.trim()) {
    notice.hidden = true;
    pendingImport = null;
    $('#import-add').disabled = true;
    $('#import-replace').disabled = true;
    return;
  }

  try {
    const parsed = importer.parse(text);
    pendingImport = parsed;

    const labels = {
      'tabcove-json': 'a Tabcove backup',
      'generic-json': 'a JSON tab list',
      'onetab-text': 'a OneTab list',
      'url-list': 'a plain list of addresses',
    };

    notice.className = 'notice notice--ok';
    message.textContent = `Recognised ${labels[parsed.format] || 'a tab list'} — ${plural(
      parsed.stats.collections,
      'collection'
    )} with ${plural(parsed.stats.tabs, 'tab')}.`;
    notice.hidden = false;

    $('#import-add').disabled = false;
    $('#import-replace').disabled = false;
  } catch (error) {
    pendingImport = null;
    notice.className = 'notice notice--warn';
    message.textContent = error.message;
    notice.hidden = false;
    $('#import-add').disabled = true;
    $('#import-replace').disabled = true;
  }
}

async function runImport(mode) {
  if (!pendingImport) return;

  await guard(async () => {
    const result = await importer.importCollections(pendingImport.collections, { mode });

    success(`Imported ${plural(result.tabs, 'tab')}`, {
      detail: `${plural(result.imported, 'collection')}${
        result.failures?.length ? ` · ${result.failures.length} skipped` : ''
      }. A restore point was saved first.`,
    });

    $('#import-text').value = '';
    $('#file-name').textContent = '';
    previewImport();
    await paintStats();
  }, 'That import did not complete.');
}

function confirmReplaceImport() {
  confirmDialog({
    title: 'Replace your whole library?',
    body: `Every current collection will be deleted and replaced with ${plural(
      pendingImport?.stats.collections || 0,
      'collection'
    )} from this file. A restore point is created first, so this is reversible from the library.`,
    confirmLabel: 'Replace everything',
    danger: true,
    requireTyping: 'REPLACE',
    onConfirm: () => runImport('replace'),
  });
}

/* ------------------------------------------------------------- maintenance --- */

function wireMaintenance() {
  $('#find-duplicates').addEventListener('click', () =>
    guard(async () => {
      const { groups, totalExtra } = await db.findDuplicates();
      const notice = $('#duplicate-result');
      const text = $('#duplicate-text');
      const mergeButton = $('#merge-duplicates');

      if (!totalExtra) {
        notice.className = 'notice notice--ok';
        text.textContent = 'No duplicates found. Every saved address appears once.';
        mergeButton.hidden = true;
      } else {
        notice.className = 'notice notice--warn';
        text.textContent = `${plural(totalExtra, 'duplicate')} across ${plural(
          groups.length,
          'address',
          'addresses'
        )}. Merging keeps the oldest copy of each — the one with the context you remember.`;
        mergeButton.hidden = false;
      }
      notice.hidden = false;
    }, 'The duplicate check did not run.')
  );

  $('#merge-duplicates').addEventListener('click', () =>
    guard(async () => {
      const { removed } = await db.mergeDuplicates();
      success(`${plural(removed, 'duplicate')} removed`, {
        detail: 'A restore point was saved first.',
      });
      $('#duplicate-result').hidden = true;
      await paintStats();
    }, 'Those duplicates could not be merged.')
  );

  $('#open-snapshots').addEventListener('click', () => openLibraryView('snapshots'));
  $('#open-trash').addEventListener('click', () => openLibraryView('trash'));
  $('#open-library').addEventListener('click', () => openLibraryView());
}

function openLibraryView(view = null) {
  const base = chrome.runtime.getURL('library/library.html');
  chrome.tabs.create({ url: view ? `${base}?view=${view}` : base });
}

/* ------------------------------------------------------------------- about --- */

function wireAbout() {
  $('#open-shortcuts').addEventListener('click', () => {
    // chrome://extensions/shortcuts cannot be opened by tabs.create from an
    // extension, so it is put on the clipboard with an explanation instead.
    navigator.clipboard
      ?.writeText('chrome://extensions/shortcuts')
      .then(() =>
        success('Address copied', {
          detail: 'Paste chrome://extensions/shortcuts into the address bar — Chrome blocks extensions from opening it directly.',
        })
      )
      .catch(() =>
        warn('Open chrome://extensions/shortcuts', {
          detail: 'Chrome blocks extensions from opening that page for you.',
        })
      );
  });

  $('#reset-settings').addEventListener('click', () =>
    confirmDialog({
      title: 'Reset settings?',
      body: 'Every preference returns to its default. Your collections, restore points, and bin are untouched.',
      confirmLabel: 'Reset settings',
      onConfirm: () =>
        guard(async () => {
          settings = await resetSettings();
          applyAppearance(document, settings);
          bindSettings();
          success('Settings reset');
        }, 'Those settings could not be reset.'),
    })
  );
}

/* ------------------------------------------------------------- danger zone --- */

function wireDangerZone() {
  $('#empty-trash').addEventListener('click', () =>
    guard(async () => {
      const count = await trash.count();
      if (!count) {
        warn('The bin is already empty');
        return;
      }

      confirmDialog({
        title: 'Empty the undo bin?',
        body: `${plural(count, 'collection')} will be permanently removed. A restore point is created first, so this is still recoverable from Restore points.`,
        confirmLabel: 'Empty the bin',
        danger: true,
        requireTyping: 'EMPTY',
        onConfirm: () =>
          guard(async () => {
            await snapshots.capture(SNAPSHOT_REASON.EMPTY_TRASH);
            const removed = await trash.empty();
            success(`${plural(removed, 'item')} removed`);
            await paintStats();
          }, 'The bin could not be emptied.'),
      });
    }, 'That did not work.')
  );

  $('#wipe-all').addEventListener('click', () =>
    guard(async () => {
      const stats = await db.getStats();

      confirmDialog({
        title: 'Delete everything?',
        body: `This removes ${plural(stats.collections, 'collection')}, ${plural(
          stats.tabs,
          'saved tab'
        )}, every restore point, and everything in the bin from this device. This one cannot be undone — export a backup first.`,
        confirmLabel: 'Delete everything',
        danger: true,
        requireTyping: 'DELETE EVERYTHING',
        offerBackup: true,
        onConfirm: () =>
          guard(async () => {
            await storage.clear();
            await db.init();
            settings = await getSettings();
            applyAppearance(document, settings);
            bindSettings();
            success('Everything deleted');
            await paintStats();
          }, 'That could not be completed.'),
      });
    }, 'That did not work.')
  );
}

/* ------------------------------------------------------------------- stats --- */

async function paintStats() {
  const [stats, used, meta, snapList] = await Promise.all([
    db.getStats(),
    storage.bytesInUse(null),
    db.getMeta(),
    snapshots.list(),
  ]);

  $('#stat-collections').textContent = formatNumber(stats.collections);
  $('#stat-tabs').textContent = formatNumber(stats.tabs);
  $('#stat-storage').textContent = bytes(used);
  $('#stat-snapshots').textContent = formatNumber(snapList.length);

  const ratio = Math.min(1, used / QUOTA.SOFT_BUDGET_BYTES);
  const pct = Math.round(ratio * 100);
  const fill = $('#storage-fill');
  fill.style.width = `${Math.max(2, pct)}%`;
  fill.className = `meter__fill${
    ratio >= QUOTA.CRITICAL_AT
      ? ' meter__fill--danger'
      : ratio >= QUOTA.WARN_AT
        ? ' meter__fill--warn'
        : ''
  }`;

  const shownPct = used > 0 && pct === 0 ? 'under 1%' : `${pct}%`;
  $('#storage-note').textContent =
    ratio >= QUOTA.WARN_AT
      ? `${shownPct} of a comfortable 10 MB. Tabcove has unlimited storage enabled, so it will keep saving — but this is a good moment to export a backup and clear out what you no longer need.`
      : `${shownPct} of a comfortable 10 MB. Roughly ${formatNumber(
          Math.max(0, Math.round((QUOTA.SOFT_BUDGET_BYTES - used) / 110))
        )} more tabs before that mark.`;

  $('#backup-when').textContent = meta.lastBackupAt ? relativeTime(meta.lastBackupAt) : 'Never';
  const since = Math.max(0, stats.tabs - (meta.lastBackupCount || 0));
  $('#backup-since').textContent = formatNumber(since);
}

/* ------------------------------------------------------------------ dialog --- */

function confirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  danger = false,
  requireTyping = null,
  offerBackup = false,
}) {
  const backdrop = el('div', { className: 'dialog-backdrop' });
  const dialog = el('div', {
    className: 'dialog',
    attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
  });

  dialog.appendChild(el('div', { className: 'dialog__title', text: title }));
  dialog.appendChild(el('div', { className: 'dialog__body', text: body }));

  if (offerBackup) {
    dialog.appendChild(
      el('button', {
        className: 'btn btn--brand btn--block',
        text: 'Export a backup first',
        attrs: { type: 'button' },
        style: { marginBottom: 'var(--s-4)' },
        on: {
          click: () =>
            guard(async () => {
              const payload = await exportLibrary('json');
              downloadBlob(payload.filename, payload.content, payload.mime);
              success('Backup saved', { detail: payload.filename });
            }, 'That backup could not be created.'),
        },
      })
    );
  }

  let input = null;
  let confirmButton = null;

  if (requireTyping) {
    dialog.appendChild(
      el('label', {
        className: 'meta',
        text: `Type ${requireTyping} to confirm`,
        attrs: { for: 'confirm-typed' },
      })
    );
    input = el('input', {
      id: 'confirm-typed',
      className: 'input',
      attrs: { type: 'text', autocomplete: 'off', spellcheck: 'false' },
      style: { marginTop: 'var(--s-2)' },
      on: {
        input: () => {
          confirmButton.disabled = input.value.trim() !== requireTyping;
        },
      },
    });
    dialog.appendChild(input);
  }

  const previouslyFocused = document.activeElement;
  const close = () => {
    release();
    backdrop.remove();
    previouslyFocused?.focus?.();
  };

  confirmButton = el('button', {
    className: `btn ${danger ? 'btn--danger' : 'btn--brand'}`,
    text: confirmLabel,
    attrs: { type: 'button' },
    on: {
      click: () => {
        close();
        onConfirm();
      },
    },
  });
  if (requireTyping) confirmButton.disabled = true;

  dialog.appendChild(
    el('div', { className: 'dialog__actions', style: { marginTop: 'var(--s-5)' } }, [
      el('button', {
        className: 'btn',
        text: 'Cancel',
        attrs: { type: 'button' },
        on: { click: close },
      }),
      confirmButton,
    ])
  );

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  const release = trapFocus(dialog, { onEscape: close });
  (input || confirmButton).focus();

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
}

/* -------------------------------------------------------------------- boot --- */

main().catch((error) => {
  document.body.prepend(
    el('div', {
      className: 'notice notice--danger',
      style: { margin: 'var(--s-4)' },
    }, [
      el('div', { className: 'notice__body' }, [
        el('strong', { text: 'Tabcove settings could not load.' }),
        el('div', { text: error?.message || String(error) }),
      ]),
    ])
  );
});
