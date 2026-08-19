/**
 * Tabcove — library.
 *
 * The home base: browse, search, restore, organise, recover.
 *
 * Design notes worth knowing before editing:
 *
 *   - Collections render COLLAPSED. Painting 96 headers is instant; painting
 *     1,284 rows is not. Rows mount only when a collection is expanded.
 *   - Every destructive action returns an inverse operation and shows an undo
 *     toast. Nothing here is final on the first click.
 *   - Data reaches the DOM only through textContent/setAttribute (see dom.js).
 *     Titles come from arbitrary web pages, so this is a security rule.
 */

import * as db from '../lib/db.js';
import * as trash from '../lib/trash.js';
import * as snapshots from '../lib/snapshots.js';
import * as capture from '../lib/capture.js';
import * as restore from '../lib/restore.js';
import * as search from '../lib/search.js';
import * as storage from '../lib/storage.js';
import { exportLibrary, exportCollection } from '../lib/exporter.js';
import { getSettings, applyAppearance, invalidate as invalidateSettings } from '../lib/settings.js';
import { VirtualList } from '../lib/virtual-list.js';
import { $, $$, el, icon, iconButton, clear, faviconUrl, downloadBlob, trapFocus } from '../lib/dom.js';
import {
  relativeTime,
  absoluteTime,
  plural,
  formatNumber,
  bytes,
  hostname,
} from '../lib/format.js';
import { toast, success, warn, guard } from '../lib/toast.js';
import { GROUP_COLOR_HEX, QUOTA, EXPORT_FORMATS, SNAPSHOT_REASON } from '../lib/constants.js';

/* ------------------------------------------------------------------- state --- */

const state = {
  view: 'all', // all | pinned | locked | snapshots | trash | tag:<name>
  sort: 'updated',
  query: '',
  index: [],
  settings: null,
  expanded: new Set(),
  focusId: null,
  loadedCollections: new Map(),
};

let searchTimer = null;

/* ----------------------------------------------------------------- startup --- */

async function main() {
  state.settings = await getSettings();
  applyAppearance(document, state.settings);

  await db.init();

  // Housekeeping the alarm may have missed if the worker was asleep.
  trash.sweep(state.settings.trashDays).catch(() => {});

  paintStaticIcons();
  wireHeader();
  wireRail();
  wirePalette();
  wireKeyboard();

  // Deep links: ?focus=<collection id> from the popup and the service worker,
  // ?view=snapshots|trash from the options page.
  const params = new URLSearchParams(location.search);
  state.focusId = params.get('focus');
  if (state.focusId) state.expanded.add(state.focusId);

  const requestedView = params.get('view');
  if (['pinned', 'locked', 'snapshots', 'trash'].includes(requestedView)) {
    state.view = requestedView;
    for (const button of $$('.rail__item[data-view]')) {
      button.classList.toggle('rail__item--active', button.dataset.view === requestedView);
    }
  }

  await refresh();

  // Keep every open surface consistent without any message passing.
  storage.onChanged((changes) => {
    if (changes['tc:settings']) {
      invalidateSettings();
      getSettings().then((s) => {
        state.settings = s;
        applyAppearance(document, s);
        refresh();
      });
      return;
    }
    search.invalidate();
    state.loadedCollections.clear();
    refresh();
  });
}

function paintStaticIcons() {
  $('#open-options').appendChild(icon('settings', { size: 18 }));
  $('.search-field').prepend(icon('search', { size: 16 }));
}

/* ------------------------------------------------------------------ header --- */

function wireHeader() {
  const input = $('#search');

  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = input.value.trim();
      renderView();
    }, 90);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && input.value) {
      event.stopPropagation();
      input.value = '';
      state.query = '';
      renderView();
    }
  });

  $('#stow-all').addEventListener('click', () =>
    guard(async () => {
      const result = await capture.capture(capture.SCOPE.CURRENT_WINDOW);
      if (result.empty) {
        warn('Nothing to stow', { detail: 'Every open tab is pinned or excluded.' });
        return;
      }
      state.expanded.add(result.collection.id);
      state.focusId = result.collection.id;
      success(`${plural(result.collection.tabs.length, 'tab')} stowed`, {
        detail: result.groups ? `${plural(result.groups, 'group')} kept` : null,
        action: {
          label: 'Undo',
          onClick: async () => {
            await restore.restoreCollection(result.collection.id, { consume: true });
            await refresh();
          },
        },
      });
      await refresh();
    }, 'Those tabs could not be stowed.')
  );

  $('#open-options').addEventListener('click', () => chrome.runtime.openOptionsPage());

  $('#sort').addEventListener('change', (event) => {
    state.sort = event.target.value;
    renderView();
  });

  $('#expand-all').addEventListener('click', () => {
    const visible = visibleEntries();
    const allOpen = visible.every((e) => state.expanded.has(e.id));
    if (allOpen) state.expanded.clear();
    else for (const e of visible) state.expanded.add(e.id);
    $('#expand-all').textContent = allOpen ? 'Expand all' : 'Collapse all';
    renderView();
  });

  $('#export-menu').addEventListener('click', (event) => openExportMenu(event.currentTarget));
}

/* -------------------------------------------------------------------- rail --- */

function wireRail() {
  for (const button of $$('.rail__item[data-view]')) {
    button.addEventListener('click', () => setView(button.dataset.view));
  }
}

function setView(view) {
  state.view = view;
  paintRailActive();
  renderView();
}

/**
 * Mark the current view in the rail.
 *
 * Compared strictly rather than by stripping the `tag:` prefix — otherwise a tag
 * literally named "all" or "pinned" would light up alongside the built-in filter
 * of the same name.
 */
function paintRailActive() {
  const activeTag = state.view.startsWith('tag:') ? state.view.slice(4) : null;
  for (const button of $$('.rail__item')) {
    const isView = !activeTag && button.dataset.view === state.view;
    const isTag = activeTag !== null && button.dataset.tag === activeTag;
    button.classList.toggle('rail__item--active', isView || isTag);
  }
}

/* ----------------------------------------------------------------- refresh --- */

async function refresh() {
  state.index = await db.getIndex();
  await Promise.all([paintRailCounts(), paintStorage()]);
  renderView();
}

async function paintRailCounts() {
  const stats = await db.getStats();
  const [trashCount, snapList] = await Promise.all([trash.count(), snapshots.list()]);

  $('[data-count="all"]').textContent = formatNumber(stats.collections);
  $('[data-count="pinned"]').textContent = formatNumber(stats.pinned);
  $('[data-count="locked"]').textContent = formatNumber(stats.locked);
  $('[data-count="trash"]').textContent = formatNumber(trashCount);
  $('[data-count="snapshots"]').textContent = formatNumber(snapList.length);

  // Tags appear only once the user has made some — an empty section is noise.
  const tagsSection = $('#tags-section');
  const tagList = $('#tag-list');
  clear(tagList);

  if (stats.tags.length) {
    tagsSection.hidden = false;
    for (const tag of stats.tags) {
      const count = state.index.filter((e) => (e.tags || []).includes(tag)).length;
      const item = el('li', {}, [
        el(
          'button',
          {
            className: 'rail__item',
            attrs: { type: 'button' },
            dataset: { tag },
            on: { click: () => setView(`tag:${tag}`) },
          },
          [
            el('span', { className: 'rail__label', text: tag }),
            el('span', { className: 'rail__count', text: formatNumber(count) }),
          ]
        ),
      ]);
      tagList.appendChild(item);
    }
  } else {
    tagsSection.hidden = true;
  }

  // The tag buttons were just rebuilt, so re-apply the active marker.
  paintRailActive();
}

/**
 * The storage meter.
 *
 * Permanently visible rather than hidden behind a settings page. Telling users
 * the truth about their storage is cheaper than the support ticket when it runs
 * out — and it is the honest thing for a product sold on durability to do.
 */
async function paintStorage() {
  const [used, meta, stats] = await Promise.all([
    storage.bytesInUse(null),
    db.getMeta(),
    db.getStats(),
  ]);

  const ratio = Math.min(1, used / QUOTA.SOFT_BUDGET_BYTES);
  const pct = Math.round(ratio * 100);

  // "0%" next to a visible library reads as a bug. Say "under 1%" instead.
  $('#storage-pct').textContent = used > 0 && pct === 0 ? 'under 1%' : `${pct}%`;
  const fill = $('#storage-fill');
  fill.style.width = `${Math.max(2, pct)}%`;
  fill.className = `meter__fill${
    ratio >= QUOTA.CRITICAL_AT
      ? ' meter__fill--danger'
      : ratio >= QUOTA.WARN_AT
        ? ' meter__fill--warn'
        : ''
  }`;

  $('#storage-meter').setAttribute('aria-label', `Storage used: ${pct} percent`);
  $('#storage-detail').textContent = `${bytes(used)} · ${plural(stats.tabs, 'tab')}`;

  $('#rail-backup').textContent = meta.lastBackupAt
    ? `Last backup: ${relativeTime(meta.lastBackupAt)}`
    : 'Last backup: never';
}

/* -------------------------------------------------------------- view router --- */

/**
 * Render generation counter.
 *
 * Three of the render paths are async. Without a generation check, typing
 * quickly can leave two searches in flight and both append their results to the
 * same container, so the user sees every hit twice.
 */
let renderGeneration = 0;

function renderView() {
  const view = $('#view');
  clear(view);

  const generation = ++renderGeneration;
  const stale = () => generation !== renderGeneration;

  if (state.query) {
    renderSearch(view, stale);
    return;
  }

  switch (state.view) {
    case 'snapshots':
      renderSnapshots(view, stale);
      return;
    case 'trash':
      renderTrash(view, stale);
      return;
    default:
      renderCollections(view);
  }
}

/** The entries the current filter selects, in the current sort order. */
function visibleEntries() {
  let entries = [...state.index];

  if (state.view === 'pinned') entries = entries.filter((e) => e.pinned);
  else if (state.view === 'locked') entries = entries.filter((e) => e.locked);
  else if (state.view.startsWith('tag:')) {
    const tag = state.view.slice(4);
    entries = entries.filter((e) => (e.tags || []).includes(tag));
  }

  const sorters = {
    updated: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
    oldest: (a, b) => (a.createdAt || 0) - (b.createdAt || 0),
    title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
    size: (a, b) => b.count - a.count,
  };
  entries.sort(sorters[state.sort] || sorters.updated);

  // Pinned collections float to the top in every sort except explicit A–Z.
  if (state.sort !== 'title') {
    entries.sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }

  return entries;
}

/* ------------------------------------------------------------- collections --- */

function renderCollections(root) {
  const entries = visibleEntries();

  $('#summary').textContent = entries.length
    ? `${plural(entries.length, 'collection')} · ${plural(
        entries.reduce((n, e) => n + e.count, 0),
        'tab'
      )}`
    : 'Nothing here yet';

  if (!entries.length) {
    root.appendChild(emptyState());
    return;
  }

  const list = el('div', { className: 'collections', attrs: { role: 'list' } });
  for (const entry of entries) list.appendChild(collectionCard(entry));
  root.appendChild(list);

  // Scroll a freshly stowed collection into view so the user sees where it went.
  if (state.focusId) {
    const card = $(`[data-collection="${cssEscape(state.focusId)}"]`, root);
    if (card) {
      card.classList.add('collection--focused');
      card.scrollIntoView({ block: 'nearest' });
      setTimeout(() => card.classList.remove('collection--focused'), 2200);
    }
    state.focusId = null;
  }
}

function emptyState() {
  const isFiltered = state.view !== 'all';

  const wrap = el('div', { className: 'empty' });
  wrap.appendChild(icon('library', { size: 44, className: 'empty__icon' }));

  if (isFiltered) {
    wrap.appendChild(el('div', { className: 'empty__title', text: 'Nothing here' }));
    wrap.appendChild(
      el('div', {
        className: 'empty__desc',
        text:
          state.view === 'pinned'
            ? 'Pin a collection to keep it at the top of your library.'
            : state.view === 'locked'
              ? 'Lock a collection to protect it from being deleted or consumed.'
              : 'No collections carry that tag.',
      })
    );
    wrap.appendChild(
      el('div', { className: 'empty__actions' }, [
        el('button', {
          className: 'btn',
          text: 'Show all collections',
          attrs: { type: 'button' },
          on: { click: () => setView('all') },
        }),
      ])
    );
    return wrap;
  }

  wrap.appendChild(el('div', { className: 'empty__title', text: 'Nothing stowed yet' }));
  wrap.appendChild(
    el('div', {
      className: 'empty__desc',
      text:
        'Your saved tabs will live here — searchable, exportable, and recoverable. Stow a window to get started.',
    })
  );
  wrap.appendChild(
    el('div', { className: 'empty__actions' }, [
      el('button', {
        className: 'btn btn--primary',
        text: 'Stow all tabs',
        attrs: { type: 'button' },
        on: { click: () => $('#stow-all').click() },
      }),
      el('button', {
        className: 'btn',
        text: 'Import from OneTab',
        attrs: { type: 'button' },
        on: { click: () => chrome.runtime.openOptionsPage() },
      }),
    ])
  );
  return wrap;
}

function collectionCard(entry) {
  const open = state.expanded.has(entry.id);

  const card = el('article', {
    className: 'collection',
    attrs: { role: 'listitem', 'aria-label': entry.title },
    dataset: { collection: entry.id, open: String(open) },
  });

  /* ---- header ---- */
  const header = el('div', { className: 'collection__header' });

  const toggle = el('button', {
    className: 'collection__toggle',
    attrs: {
      type: 'button',
      'aria-expanded': String(open),
      'aria-label': open ? `Collapse ${entry.title}` : `Expand ${entry.title}`,
    },
    on: { click: () => toggleCollection(entry.id) },
  });
  toggle.appendChild(icon('chevron', { size: 16 }));
  header.appendChild(toggle);

  const mainCol = el('div', { className: 'collection__main' });

  const titleRow = el('div', { className: 'collection__title' });
  const name = el('button', {
    className: 'collection__name',
    text: entry.title,
    attrs: { type: 'button', title: 'Click to rename' },
    on: { click: (event) => startRename(event.currentTarget, entry) },
  });
  titleRow.appendChild(name);

  if (entry.pinned) titleRow.appendChild(badge('Pinned', 'badge--brand'));
  if (entry.locked) titleRow.appendChild(badge('Locked'));
  mainCol.appendChild(titleRow);

  const meta = el('div', { className: 'collection__meta' }, [
    el('span', { text: plural(entry.count, 'tab') }),
    entry.groups ? el('span', { text: `${plural(entry.groups, 'group')}` }) : null,
    entry.windows > 1 ? el('span', { text: plural(entry.windows, 'window') }) : null,
    el('span', {
      text: relativeTime(entry.updatedAt),
      attrs: { title: absoluteTime(entry.updatedAt) },
    }),
  ]);

  if (entry.tags?.length) {
    const tags = el('span', { className: 'collection__tags' });
    for (const tag of entry.tags) tags.appendChild(el('span', { className: 'tag-pill', text: tag }));
    meta.appendChild(tags);
  }
  mainCol.appendChild(meta);
  header.appendChild(mainCol);

  /* ---- actions ---- */
  const actions = el('div', { className: 'collection__actions' });

  actions.appendChild(
    el('button', {
      className: 'btn btn--sm',
      text: 'Restore all',
      attrs: { type: 'button' },
      on: { click: () => restoreWhole(entry) },
    })
  );

  actions.appendChild(
    iconButton('more', `More actions for ${entry.title}`, (event) =>
      openCollectionMenu(event.currentTarget, entry)
    )
  );

  header.appendChild(actions);
  card.appendChild(header);

  /* ---- body (only mounted when open) ---- */
  if (open) {
    const body = el('div', { className: 'collection__body' });
    body.appendChild(el('div', { className: 'meta', text: 'Loading…' }));
    card.appendChild(body);
    mountTabs(entry.id, body);
  }

  return card;
}

function badge(text, extra = '') {
  return el('span', { className: `badge ${extra}`.trim(), text });
}

/** Load and render a collection's tabs, honouring saved tab groups. */
async function mountTabs(collectionId, container) {
  const collection =
    state.loadedCollections.get(collectionId) || (await db.getCollection(collectionId));

  if (!collection) {
    clear(container).appendChild(
      el('div', { className: 'meta', text: 'That collection could not be read.' })
    );
    return;
  }
  state.loadedCollections.set(collectionId, collection);

  clear(container);

  const groups = collection.groups || [];
  const rendered = new Set();

  // Grouped tabs first, in group order — this is the fidelity competitors lack.
  groups.forEach((group, groupIx) => {
    const tabs = collection.tabs
      .map((tab, i) => ({ tab, i }))
      .filter(({ tab }) => tab.groupId === groupIx);
    if (!tabs.length) return;

    const band = el('div', {
      className: 'group-band',
      attrs: { role: 'group', 'aria-label': group.title || 'Untitled group' },
      style: { '--gc': GROUP_COLOR_HEX[group.color] || GROUP_COLOR_HEX.grey },
    });

    const nameRow = el('div', { className: 'group-band__name' }, [
      el('span', { className: 'group-dot' }),
      el('span', { text: group.title || 'Untitled group' }),
      el('span', { className: 'faint', text: plural(tabs.length, 'tab') }),
    ]);
    band.appendChild(nameRow);

    for (const { tab, i } of tabs) {
      band.appendChild(tabRow(collection, tab, i));
      rendered.add(i);
    }
    container.appendChild(band);
  });

  const loose = collection.tabs
    .map((tab, i) => ({ tab, i }))
    .filter(({ i }) => !rendered.has(i));

  if (!loose.length) return;

  // Below the threshold, plain DOM is cheaper than virtualising. Above it, a
  // windowed renderer keeps a 5,000-tab collection at ~40 nodes and a 6ms frame.
  if (loose.length <= VIRTUALISE_ABOVE) {
    const list = el('div', { attrs: { role: 'list' } });
    for (const { tab, i } of loose) list.appendChild(tabRow(collection, tab, i));
    container.appendChild(list);
    return;
  }

  const rowHeight = state.settings.density === 'compact' ? 28 : 36;
  const scroller = el('div', {
    className: 'tab-scroller',
    attrs: { role: 'list', 'aria-label': `${collection.title} — ${plural(loose.length, 'tab')}` },
    // Cap the height so one huge collection cannot push everything else off-screen.
    style: { height: `${Math.min(loose.length, 14) * rowHeight}px` },
  });
  container.appendChild(scroller);

  const virtual = new VirtualList({
    container: scroller,
    rowHeight,
    renderRow: ({ tab, i }) => tabRow(collection, tab, i),
    getKey: ({ i }) => `${collection.id}:${i}`,
  });
  virtual.setItems(loose);

  container.appendChild(
    el('div', {
      className: 'meta faint',
      style: { paddingTop: 'var(--s-2)' },
      text: `Scroll to see all ${plural(loose.length, 'tab')}.`,
    })
  );
}

/** Above this many ungrouped tabs, the list is virtualised. */
const VIRTUALISE_ABOVE = 60;

function tabRow(collection, tab, tabIndex) {
  const row = el('div', {
    className: 'tab-row',
    attrs: { role: 'listitem' },
  });

  if (state.settings.showFavicons) {
    const img = el('img', {
      className: 'tab-row__favicon',
      attrs: {
        src: faviconUrl(tab.url, 32),
        alt: '',
        width: 16,
        height: 16,
        loading: 'lazy',
      },
    });
    // A missing favicon must not leave a broken-image glyph in a dense list.
    img.addEventListener('error', () => {
      img.style.visibility = 'hidden';
    });
    row.appendChild(img);
  }

  if (tab.pinned) row.appendChild(icon('pin', { size: 13, className: 'icon faint' }));

  row.appendChild(
    el('a', {
      className: 'tab-row__title',
      text: tab.title || tab.url,
      attrs: { href: tab.url, target: '_blank', rel: 'noreferrer noopener', title: tab.url },
    })
  );

  row.appendChild(el('span', { className: 'tab-row__host', text: hostname(tab.url) }));

  const actions = el('div', { className: 'tab-row__actions' });
  actions.appendChild(
    iconButton(
      'external',
      'Open this tab',
      () =>
        guard(async () => {
          const result = await restore.restoreOne(tab.url, { active: true });
          if (!result.opened) {
            warn('Chrome would not open that address', { detail: result.skipped[0]?.reason });
          }
        }, 'That tab could not be opened.'),
      { className: 'icon-btn--sm', size: 14 }
    )
  );
  actions.appendChild(
    iconButton('close', 'Remove this tab from the collection', () => removeTab(collection, tabIndex), {
      className: 'icon-btn--sm icon-btn--danger',
      size: 14,
    })
  );
  row.appendChild(actions);

  return row;
}

/* ----------------------------------------------------------------- actions --- */

function toggleCollection(id) {
  if (state.expanded.has(id)) state.expanded.delete(id);
  else state.expanded.add(id);
  renderView();
}

async function restoreWhole(entry, { newWindow = false } = {}) {
  await guard(async () => {
    const result = await restore.restoreCollection(entry.id, { newWindow });

    const details = [];
    if (result.groupsRestored) details.push(`${plural(result.groupsRestored, 'group')} rebuilt`);
    if (result.skipped.length) {
      details.push(`${result.skipped.length} blocked by Chrome`);
    }

    if (!result.opened && result.skipped.length) {
      warn('Chrome would not reopen those tabs', {
        detail: result.skipped[0]?.reason,
      });
      return;
    }

    success(`${plural(result.opened, 'tab')} restored`, {
      detail: details.join(' · ') || null,
    });
  }, `${entry.title} could not be restored.`);
}

/**
 * Rename in place.
 * Inline editing rather than a dialogue: renaming is the most frequent
 * organisational action, and a modal for it is friction with no benefit.
 */
function startRename(button, entry) {
  const original = entry.title;

  const input = el('input', {
    className: 'input',
    attrs: { type: 'text', value: original, 'aria-label': 'Collection name' },
    style: { maxWidth: '380px', minHeight: '28px' },
  });

  button.replaceWith(input);
  input.focus();
  input.select();

  let done = false;
  const finish = async (commit) => {
    if (done) return;
    done = true;

    const next = input.value.trim();
    if (!commit || !next || next === original) {
      renderView();
      return;
    }

    await guard(async () => {
      await db.updateCollection(entry.id, { title: next });
      success('Collection renamed', {
        action: {
          label: 'Undo',
          onClick: async () => {
            await db.updateCollection(entry.id, { title: original });
            await refresh();
          },
        },
      });
    }, 'That rename did not save.');
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finish(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
  });
  input.addEventListener('blur', () => finish(true));
}

async function removeTab(collection, tabIndex) {
  await guard(async () => {
    const snapshot = JSON.parse(JSON.stringify(collection));
    const result = await db.removeTab(collection.id, tabIndex);
    if (!result) return;

    state.loadedCollections.delete(collection.id);

    toast('Tab removed', {
      detail: result.collectionDeleted ? 'The collection is now empty and went to the bin.' : null,
      action: {
        label: 'Undo',
        onClick: async () => {
          if (result.collectionDeleted) await db.reinsertCollection(snapshot);
          else await db.updateCollection(collection.id, snapshot);
          await refresh();
        },
      },
    });
  }, 'That tab could not be removed.');
}

async function deleteCollection(entry) {
  await guard(async () => {
    const removed = await db.deleteCollection(entry.id);
    if (!removed) return;

    toast(`"${removed.title}" deleted`, {
      detail: `Recoverable from the bin for ${state.settings.trashDays} days.`,
      action: {
        label: 'Undo',
        onClick: async () => {
          await db.reinsertCollection(removed);
          await refresh();
        },
      },
    });
  }, 'That collection could not be deleted.');
}

/* -------------------------------------------------------------------- menus --- */

function openCollectionMenu(anchor, entry) {
  const items = [
    {
      icon: 'window',
      label: 'Restore in a new window',
      onClick: () => restoreWhole(entry, { newWindow: true }),
    },
    {
      icon: 'pin',
      label: entry.pinned ? 'Unpin' : 'Pin to the top',
      onClick: () =>
        guard(() => db.updateCollection(entry.id, { pinned: !entry.pinned }), 'That did not save.'),
    },
    {
      icon: 'lock',
      label: entry.locked ? 'Unlock' : 'Lock (protect from deletion)',
      onClick: () =>
        guard(() => db.updateCollection(entry.id, { locked: !entry.locked }), 'That did not save.'),
    },
    { icon: 'tag', label: 'Edit tags…', onClick: () => editTags(entry) },
    { separator: true },
    {
      icon: 'export',
      label: 'Export this collection',
      onClick: () => openExportMenu(anchor, entry.id),
    },
    { separator: true },
    {
      icon: 'trash',
      label: 'Delete',
      danger: true,
      onClick: () => deleteCollection(entry),
    },
  ];

  showMenu(anchor, items);
}

function openExportMenu(anchor, collectionId = null) {
  const labels = {
    json: 'JSON — complete backup',
    html: 'HTML — a clickable page',
    markdown: 'Markdown — for notes apps',
    csv: 'CSV — for spreadsheets',
    text: 'Plain text — one link per line',
  };

  showMenu(
    anchor,
    EXPORT_FORMATS.map((format) => ({
      icon: 'export',
      label: labels[format],
      onClick: () =>
        guard(async () => {
          const payload = collectionId
            ? await exportCollection(collectionId, format)
            : await exportLibrary(format);

          downloadBlob(payload.filename, payload.content, payload.mime);

          // A full-library JSON export counts as a backup; a single collection
          // does not, because it is not one.
          if (!collectionId && format === 'json') {
            const stats = await db.getStats();
            await db.setMeta({ lastBackupAt: Date.now(), lastBackupCount: stats.tabs });
            await paintStorage();
            chrome.runtime.sendMessage({ type: 'refresh-badge' }, () => void chrome.runtime.lastError);
          }

          success(`Exported ${plural(payload.stats.tabs, 'tab')}`, {
            detail: payload.filename,
          });
        }, 'That export could not be created.'),
    }))
  );
}

/** A lightweight popup menu with focus handling and outside-click dismissal. */
function showMenu(anchor, items) {
  closeMenu();

  const menu = el('div', { className: 'menu', attrs: { role: 'menu' } });

  for (const item of items) {
    if (item.separator) {
      menu.appendChild(el('div', { className: 'menu__sep' }));
      continue;
    }

    const button = el('button', {
      className: `menu__item${item.danger ? ' menu__item--danger' : ''}`,
      attrs: { type: 'button', role: 'menuitem' },
      on: {
        click: () => {
          closeMenu();
          item.onClick();
        },
      },
    });
    button.appendChild(icon(item.icon || 'chevron', { size: 16 }));
    button.appendChild(el('span', { text: item.label }));
    menu.appendChild(button);
  }

  document.body.appendChild(menu);

  // Position under the anchor, flipped left/up when it would leave the viewport.
  const rect = anchor.getBoundingClientRect();
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;

  let left = rect.right - width;
  if (left < 8) left = 8;

  let top = rect.bottom + 4;
  if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 4);

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;

  const release = trapFocus(menu, { onEscape: closeMenu });
  menu._release = release;
  $('.menu__item', menu)?.focus();

  setTimeout(() => {
    document.addEventListener('click', onOutsideClick, { once: true });
  }, 0);
}

function onOutsideClick() {
  closeMenu();
}

function closeMenu() {
  const menu = $('.menu');
  if (!menu) return;
  menu._release?.();
  menu.remove();
}

/** Tag editing — a small prompt-style dialogue rather than a whole page. */
function editTags(entry) {
  const backdrop = el('div', { className: 'dialog-backdrop' });
  const dialog = el('div', {
    className: 'dialog',
    attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Edit tags' },
  });

  dialog.appendChild(el('div', { className: 'dialog__title', text: 'Tags' }));
  dialog.appendChild(
    el('div', {
      className: 'dialog__body',
      text: 'Separate tags with commas. Tags become filters in the left-hand rail.',
    })
  );

  const input = el('input', {
    className: 'input',
    attrs: { type: 'text', value: (entry.tags || []).join(', '), 'aria-label': 'Tags' },
  });
  dialog.appendChild(input);

  const close = () => {
    release();
    backdrop.remove();
  };

  dialog.appendChild(
    el('div', { className: 'dialog__actions', style: { marginTop: 'var(--s-5)' } }, [
      el('button', {
        className: 'btn',
        text: 'Cancel',
        attrs: { type: 'button' },
        on: { click: close },
      }),
      el('button', {
        className: 'btn btn--brand',
        text: 'Save tags',
        attrs: { type: 'button' },
        on: {
          click: () =>
            guard(async () => {
              const tags = input.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);
              await db.updateCollection(entry.id, { tags });
              close();
              success('Tags saved');
            }, 'Those tags did not save.'),
        },
      }),
    ])
  );

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  const release = trapFocus(dialog, { onEscape: close });
  input.focus();
  input.select();

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
}

/* ------------------------------------------------------------------ search --- */

async function renderSearch(root, stale = () => false) {
  const results = await search.search(state.query);
  if (stale()) return; // a newer keystroke already started rendering

  $('#summary').textContent = results.total
    ? `${plural(results.total, 'match', 'matches')} for "${state.query}"${
        results.truncated ? ` — showing the top ${results.tabs.length}` : ''
      }`
    : `No matches for "${state.query}"`;

  if (!results.total && !results.collections.length) {
    const wrap = el('div', { className: 'empty' });
    wrap.appendChild(icon('search', { size: 44, className: 'empty__icon' }));
    wrap.appendChild(el('div', { className: 'empty__title', text: `No matches for "${state.query}"` }));
    wrap.appendChild(
      el('div', {
        className: 'empty__desc',
        text: 'Search looks at page titles, web addresses, and collection names.',
      })
    );
    wrap.appendChild(
      el('div', { className: 'empty__actions' }, [
        el('button', {
          className: 'btn',
          text: 'Clear search',
          attrs: { type: 'button' },
          on: {
            click: () => {
              $('#search').value = '';
              state.query = '';
              renderView();
            },
          },
        }),
      ])
    );
    root.appendChild(wrap);
    return;
  }

  const wrap = el('div', { className: 'results' });

  if (results.collections.length) {
    const section = el('section', { className: 'results__section' });
    section.appendChild(el('h2', { className: 'results__heading', text: 'Collections' }));
    for (const entry of results.collections) {
      section.appendChild(
        el('div', { className: 'result-row' }, [
          icon('library', { size: 16 }),
          el('div', { className: 'result-row__body' }, [
            el('span', { className: 'result-row__title', text: entry.title }),
            el('span', {
              className: 'result-row__where',
              text: `${plural(entry.count, 'tab')} · ${relativeTime(entry.updatedAt)}`,
            }),
          ]),
          el('button', {
            className: 'btn btn--sm',
            text: 'Open',
            attrs: { type: 'button' },
            on: {
              click: () => {
                $('#search').value = '';
                state.query = '';
                state.expanded.add(entry.id);
                state.focusId = entry.id;
                setView('all');
              },
            },
          }),
        ])
      );
    }
    wrap.appendChild(section);
  }

  if (results.tabs.length) {
    const section = el('section', { className: 'results__section' });
    section.appendChild(el('h2', { className: 'results__heading', text: 'Tabs' }));

    for (const hit of results.tabs) {
      section.appendChild(
        el('div', { className: 'result-row' }, [
          state.settings.showFavicons
            ? el('img', {
                className: 'tab-row__favicon',
                attrs: { src: faviconUrl(hit.url, 32), alt: '', width: 16, height: 16, loading: 'lazy' },
              })
            : null,
          el('div', { className: 'result-row__body' }, [
            el('a', {
              className: 'result-row__title',
              text: hit.title || hit.url,
              attrs: { href: hit.url, target: '_blank', rel: 'noreferrer noopener' },
            }),
            el('span', {
              className: 'result-row__where',
              text: `${hit.collectionTitle}${hit.groupTitle ? ` › ${hit.groupTitle}` : ''} · ${hit.host}`,
            }),
          ]),
        ])
      );
    }
    wrap.appendChild(section);
  }

  root.appendChild(wrap);
}

/* --------------------------------------------------------- restore points --- */

async function renderSnapshots(root, stale = () => false) {
  const list = await snapshots.list();
  if (stale()) return;
  $('#summary').textContent = `${plural(list.length, 'restore point')}`;

  root.appendChild(
    el('div', { className: 'panel-header' }, [
      el('div', {}, [
        el('h2', { text: 'Restore points' }),
        el('p', {
          className: 'panel-intro',
          text: 'Tabcove saves a snapshot of your whole library before anything destructive happens. Rolling back is itself undoable — a snapshot of the current state is taken first.',
        }),
      ]),
      el('button', {
        className: 'btn btn--sm',
        text: 'Create one now',
        attrs: { type: 'button' },
        on: {
          click: () =>
            guard(async () => {
              const snap = await snapshots.capture(SNAPSHOT_REASON.MANUAL);
              if (!snap) {
                warn('Nothing to snapshot', { detail: 'Your library is empty.' });
                return;
              }
              success('Restore point created');
              renderView();
              paintRailCounts();
            }, 'That restore point could not be created.'),
        },
      }),
    ])
  );

  if (!list.length) {
    const wrap = el('div', { className: 'empty' });
    wrap.appendChild(icon('clock', { size: 44, className: 'empty__icon' }));
    wrap.appendChild(el('div', { className: 'empty__title', text: 'No restore points yet' }));
    wrap.appendChild(
      el('div', {
        className: 'empty__desc',
        text: 'One is created automatically before anything destructive — deleting, importing, or upgrading.',
      })
    );
    root.appendChild(wrap);
    return;
  }

  const panel = el('div', { className: 'panel-list' });

  for (const snap of list) {
    panel.appendChild(
      el('div', { className: 'panel-item' }, [
        icon('clock', { size: 18 }),
        el('div', { className: 'panel-item__body' }, [
          el('div', { className: 'panel-item__title', text: absoluteTime(snap.ts) }),
          el('div', {
            className: 'panel-item__meta',
            text: `${snap.reason} · ${plural(snap.stats.collections, 'collection')} · ${plural(
              snap.stats.tabs,
              'tab'
            )} · ${bytes(snap.bytes)}`,
          }),
        ]),
        el('button', {
          className: 'btn btn--sm',
          text: 'Roll back',
          attrs: { type: 'button' },
          on: { click: () => confirmRollback(snap) },
        }),
        iconButton(
          'trash',
          'Delete this restore point',
          () =>
            guard(async () => {
              await snapshots.drop(snap.ts);
              renderView();
              paintRailCounts();
            }, 'That restore point could not be deleted.'),
          { className: 'icon-btn--sm icon-btn--danger', size: 15 }
        ),
      ])
    );
  }

  root.appendChild(panel);
}

function confirmRollback(snap) {
  confirmDialog({
    title: 'Roll back your library?',
    body: `Your library will be replaced with its state from ${absoluteTime(snap.ts)} — ${plural(
      snap.stats.collections,
      'collection'
    )} and ${plural(snap.stats.tabs, 'tab')}. A restore point of the current state is created first, so this is reversible.`,
    confirmLabel: 'Roll back',
    onConfirm: () =>
      guard(async () => {
        const stats = await snapshots.restore(snap.ts);
        success('Library rolled back', {
          detail: `${plural(stats.collections, 'collection')} · ${plural(stats.tabs, 'tab')}`,
        });
        state.expanded.clear();
        setView('all');
        await refresh();
      }, 'That roll back did not complete.'),
  });
}

/* ------------------------------------------------------------------- trash --- */

async function renderTrash(root, stale = () => false) {
  const items = await trash.list();
  if (stale()) return;
  $('#summary').textContent = `${plural(items.length, 'item')} in the bin`;

  root.appendChild(
    el('div', { className: 'panel-header' }, [
      el('div', {}, [
        el('h2', { text: 'Undo bin' }),
        el('p', {
          className: 'panel-intro',
          text: `Deleted collections stay here for ${state.settings.trashDays} days before they are removed. Nothing in Tabcove is destroyed by a single click.`,
        }),
      ]),
      items.length
        ? el('button', {
            className: 'btn btn--sm btn--danger',
            text: 'Empty the bin',
            attrs: { type: 'button' },
            on: { click: () => confirmEmptyTrash(items.length) },
          })
        : null,
    ])
  );

  if (!items.length) {
    const wrap = el('div', { className: 'empty' });
    wrap.appendChild(icon('trash', { size: 44, className: 'empty__icon' }));
    wrap.appendChild(el('div', { className: 'empty__title', text: 'The bin is empty' }));
    wrap.appendChild(
      el('div', {
        className: 'empty__desc',
        text: `Deleted collections appear here and stay recoverable for ${state.settings.trashDays} days.`,
      })
    );
    root.appendChild(wrap);
    return;
  }

  const panel = el('div', { className: 'panel-list' });

  for (const item of items) {
    const daysLeft = Math.max(
      0,
      state.settings.trashDays - Math.floor((Date.now() - item.deletedAt) / 86400000)
    );

    panel.appendChild(
      el('div', { className: 'panel-item' }, [
        icon('trash', { size: 18 }),
        el('div', { className: 'panel-item__body' }, [
          el('div', { className: 'panel-item__title', text: item.collection.title }),
          el('div', {
            className: 'panel-item__meta',
            text: `${plural(item.collection.tabs.length, 'tab')} · deleted ${relativeTime(
              item.deletedAt
            )} · ${daysLeft === 0 ? 'removed soon' : `${plural(daysLeft, 'day')} left`}`,
          }),
        ]),
        el('button', {
          className: 'btn btn--sm btn--brand',
          text: 'Put it back',
          attrs: { type: 'button' },
          on: {
            click: () =>
              guard(async () => {
                const restored = await db.restoreFromTrash(item.collection.id);
                success(`"${restored.title}" is back in your library`);
                await refresh();
              }, 'That collection could not be restored.'),
          },
        }),
      ])
    );
  }

  root.appendChild(panel);
}

function confirmEmptyTrash(count) {
  confirmDialog({
    title: 'Empty the bin?',
    body: `${plural(count, 'collection')} will be permanently removed. A restore point is created first, so this is still recoverable from Restore points.`,
    confirmLabel: 'Empty the bin',
    danger: true,
    requireTyping: 'EMPTY',
    onConfirm: () =>
      guard(async () => {
        await snapshots.capture(SNAPSHOT_REASON.EMPTY_TRASH);
        const removed = await trash.empty();
        success(`${plural(removed, 'item')} removed from the bin`);
        await refresh();
      }, 'The bin could not be emptied.'),
  });
}

/* ------------------------------------------------------------------ dialog --- */

/**
 * The only modal in the product, and only for genuinely irreversible actions.
 * `requireTyping` is used where a mis-click would be expensive.
 */
function confirmDialog({ title, body, confirmLabel, onConfirm, danger = false, requireTyping = null }) {
  const backdrop = el('div', { className: 'dialog-backdrop' });
  const dialog = el('div', {
    className: 'dialog',
    attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
  });

  dialog.appendChild(el('div', { className: 'dialog__title', text: title }));
  dialog.appendChild(el('div', { className: 'dialog__body', text: body }));

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

  const previouslyFocused = document.activeElement;
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  const release = trapFocus(dialog, { onEscape: close });
  (input || confirmButton).focus();

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
}

/* ------------------------------------------------------- command palette --- */

const paletteState = { open: false, items: [], selected: 0 };

function wirePalette() {
  const input = $('#palette-input');

  input.addEventListener('input', () => renderPalette(input.value));

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      movePaletteSelection(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      movePaletteSelection(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = paletteState.items[paletteState.selected];
      if (item) {
        closePalette();
        item.onRun(event.shiftKey);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
    }
  });

  $('#palette-backdrop').addEventListener('click', (event) => {
    if (event.target === $('#palette-backdrop')) closePalette();
  });
}

function openPalette() {
  const backdrop = $('#palette-backdrop');
  backdrop.hidden = false;
  paletteState.open = true;

  const input = $('#palette-input');
  input.value = '';
  input.focus();
  renderPalette('');
}

function closePalette() {
  $('#palette-backdrop').hidden = true;
  paletteState.open = false;
  paletteState.items = [];
  $('#search').focus();
}

function movePaletteSelection(delta) {
  if (!paletteState.items.length) return;
  paletteState.selected =
    (paletteState.selected + delta + paletteState.items.length) % paletteState.items.length;
  paintPaletteSelection();
}

function paintPaletteSelection() {
  const nodes = $$('.palette__item');
  nodes.forEach((node, i) => {
    const selected = i === paletteState.selected;
    node.setAttribute('aria-selected', String(selected));
    if (selected) node.scrollIntoView({ block: 'nearest' });
  });
}

async function renderPalette(query) {
  const results = $('#palette-results');
  clear(results);

  paletteState.items = [];
  paletteState.selected = 0;

  const commands = [
    {
      title: 'Stow all tabs',
      sub: 'Save every tab in this window',
      onRun: () => $('#stow-all').click(),
    },
    {
      title: 'Export library as JSON',
      sub: 'A complete backup you can re-import',
      onRun: () =>
        guard(async () => {
          const payload = await exportLibrary('json');
          downloadBlob(payload.filename, payload.content, payload.mime);
          const stats = await db.getStats();
          await db.setMeta({ lastBackupAt: Date.now(), lastBackupCount: stats.tabs });
          success(`Exported ${plural(payload.stats.tabs, 'tab')}`);
          await paintStorage();
        }, 'That export could not be created.'),
    },
    { title: 'Open restore points', sub: 'Roll your library back', onRun: () => setView('snapshots') },
    { title: 'Open the undo bin', sub: 'Recover a deleted collection', onRun: () => setView('trash') },
    { title: 'Open settings', sub: 'Backup, import, appearance', onRun: () => chrome.runtime.openOptionsPage() },
  ];

  const q = query.trim().toLowerCase();
  const matchedCommands = q
    ? commands.filter((c) => c.title.toLowerCase().includes(q))
    : commands;

  if (q) {
    const found = await search.search(q, { limit: 20 });

    if (found.collections.length) {
      addPaletteGroup(results, 'Collections');
      for (const entry of found.collections.slice(0, 6)) {
        addPaletteItem(results, {
          title: entry.title,
          sub: `${plural(entry.count, 'tab')} · ${relativeTime(entry.updatedAt)}`,
          icon: 'library',
          onRun: (shift) => {
            if (shift) {
              restoreWhole(entry);
            } else {
              state.expanded.add(entry.id);
              state.focusId = entry.id;
              $('#search').value = '';
              state.query = '';
              setView('all');
            }
          },
        });
      }
    }

    if (found.tabs.length) {
      addPaletteGroup(results, 'Tabs');
      for (const hit of found.tabs.slice(0, 12)) {
        addPaletteItem(results, {
          title: hit.title || hit.url,
          sub: `${hit.collectionTitle} · ${hit.host}`,
          icon: 'external',
          onRun: () => restore.restoreOne(hit.url, { active: true }),
        });
      }
    }
  }

  if (matchedCommands.length) {
    addPaletteGroup(results, 'Actions');
    for (const command of matchedCommands) {
      addPaletteItem(results, { ...command, icon: 'chevron' });
    }
  }

  if (!paletteState.items.length) {
    results.appendChild(
      el('div', { className: 'meta', style: { padding: 'var(--s-4)' }, text: 'No matches.' })
    );
  }

  paintPaletteSelection();
}

function addPaletteGroup(root, title) {
  root.appendChild(el('div', { className: 'palette__group-title', text: title }));
}

function addPaletteItem(root, { title, sub, icon: iconName, onRun }) {
  const index = paletteState.items.length;

  const node = el('button', {
    className: 'palette__item',
    attrs: { type: 'button', role: 'option', 'aria-selected': String(index === 0) },
    on: {
      click: (event) => {
        closePalette();
        onRun(event.shiftKey);
      },
      mouseenter: () => {
        paletteState.selected = index;
        paintPaletteSelection();
      },
    },
  });

  node.appendChild(icon(iconName || 'chevron', { size: 16 }));
  node.appendChild(
    el('div', { className: 'palette__item-body' }, [
      el('div', { className: 'palette__item-title', text: title }),
      sub ? el('div', { className: 'palette__item-sub', text: sub }) : null,
    ])
  );

  root.appendChild(node);
  paletteState.items.push({ onRun });
}

/* ---------------------------------------------------------------- keyboard --- */

function wireKeyboard() {
  document.addEventListener('keydown', (event) => {
    const typing =
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target?.isContentEditable;

    // Ctrl/Cmd+K works everywhere, including from inside a text field.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      paletteState.open ? closePalette() : openPalette();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
      event.preventDefault();
      openExportMenu($('#export-menu'));
      return;
    }

    if (typing) return;

    if (event.key === '/') {
      event.preventDefault();
      $('#search').focus();
    } else if (event.key === '?') {
      event.preventDefault();
      showShortcutHelp();
    } else if (event.key === 'Escape') {
      closeMenu();
    }
  });
}

function showShortcutHelp() {
  confirmDialog({
    title: 'Keyboard shortcuts',
    body: [
      'Ctrl/Cmd + K — command palette',
      '/ — focus search',
      'Ctrl/Cmd + E — export',
      'Esc — clear search or close a menu',
      '? — this list',
      '',
      'Global shortcuts (change them at chrome://extensions/shortcuts):',
      'Alt + Shift + S — stow all tabs',
      'Alt + Shift + L — open this library',
      'Alt + Shift + T — stow just the current tab',
    ].join('\n'),
    confirmLabel: 'Got it',
    onConfirm: () => {},
  });
}

/* ----------------------------------------------------------------- helpers --- */

/** CSS.escape with a fallback, for attribute selectors built from ids. */
function cssEscape(value) {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

/* -------------------------------------------------------------------- boot --- */

main().catch((error) => {
  const view = $('#view');
  if (!view) return;
  clear(view).appendChild(
    el('div', { className: 'empty' }, [
      el('div', { className: 'empty__title', text: 'Tabcove could not open your library' }),
      el('div', { className: 'empty__desc', text: error?.message || String(error) }),
      el('div', { className: 'empty__actions' }, [
        el('button', {
          className: 'btn',
          text: 'Try again',
          attrs: { type: 'button' },
          on: { click: () => location.reload() },
        }),
      ]),
    ])
  );
});

// A page-level guard: an unhandled rejection must not leave the UI silently broken.
window.addEventListener('unhandledrejection', (event) => {
  toast('Something went wrong', {
    variant: 'error',
    detail: event.reason?.message || String(event.reason),
  });
});
