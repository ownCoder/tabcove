/**
 * Tabcove — import.
 *
 * The migration path for people leaving another tab manager, and the recovery
 * path for anyone restoring one of our own backups.
 *
 * Three formats are detected automatically, because asking a frustrated user
 * "which format is your file?" at the moment they are trying to recover their
 * data is a bad answer to a question we can work out ourselves:
 *
 *   1. Tabcove JSON     — lossless round trip
 *   2. OneTab text      — `url | title`, blank-line separated lists
 *   3. Plain URL lists  — anything with one address per line
 *
 * Untrusted input is never trusted: every record is rebuilt field-by-field by
 * db.sanitiseCollection, so `__proto__` and friends in a hostile JSON file can
 * never reach an object we use.
 */

import * as db from './db.js';
import * as snapshots from './snapshots.js';
import { SNAPSHOT_REASON, LIMITS, GROUP_COLORS } from './constants.js';
import { isoDate, defaultCollectionTitle } from './format.js';

/** What a blob of text appears to be. */
export function detectFormat(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return 'empty';

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.format === 'tabcove-export') return 'tabcove-json';
      if (Array.isArray(parsed?.collections)) return 'tabcove-json';
      if (Array.isArray(parsed) && parsed.some((x) => x?.url || x?.tabs)) return 'generic-json';
      return 'unknown-json';
    } catch {
      return 'unknown';
    }
  }

  // OneTab and most text dumps put the URL first on the line.
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
  const urlish = lines.filter((l) => /^https?:\/\/\S+/i.test(l.trim()));
  if (urlish.length >= Math.max(1, lines.length * 0.4)) {
    return lines.some((l) => l.includes(' | ')) ? 'onetab-text' : 'url-list';
  }

  return 'unknown';
}

/* ---------------------------------------------------------------- parsers --- */

/** Tabcove's own JSON export. Lossless. */
function parseTabcoveJson(text) {
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : parsed.collections;
  if (!Array.isArray(list)) throw new Error('That file has no collections in it.');

  return list
    .map((c) => ({
      title: c?.title || `Imported — ${isoDate()}`,
      createdAt: c?.createdAt,
      pinned: !!c?.pinned,
      locked: !!c?.locked,
      tags: Array.isArray(c?.tags) ? c.tags : [],
      note: c?.note || '',
      windows: c?.windows || 1,
      groups: Array.isArray(c?.groups)
        ? c.groups.map((g) => ({
            title: g?.title || '',
            color: GROUP_COLORS.includes(g?.color) ? g.color : 'grey',
            collapsed: !!g?.collapsed,
          }))
        : [],
      tabs: Array.isArray(c?.tabs)
        ? c.tabs.map((t) => ({
            url: t?.url,
            title: t?.title,
            pinned: !!t?.pinned,
            groupId: Number.isInteger(t?.groupId) ? t.groupId : -1,
            windowIx: Number.isInteger(t?.windowIx) ? t.windowIx : 0,
            savedAt: t?.savedAt,
          }))
        : [],
    }))
    .filter((c) => c.tabs.length);
}

/**
 * OneTab's clipboard/export text.
 *
 * Its shape is `https://example.com | Page title`, one per line, with blank
 * lines separating lists. Blank-line separation is the only structure it has,
 * so that is the structure we honour.
 */
function parseOneTabText(text) {
  const blocks = String(text)
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const collections = [];

  for (const block of blocks) {
    const tabs = [];
    let blockTitle = null;

    for (const line of block.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Our own text export writes `--- Title (n tabs) ---` headers. Honour them.
      const header = trimmed.match(/^-{2,}\s*(.+?)\s*(?:\(\d+\s+tabs?\))?\s*-{2,}$/);
      if (header) {
        blockTitle = header[1];
        continue;
      }

      const match = trimmed.match(/^(\S+)\s*\|\s*(.*)$/);
      const url = match ? match[1] : trimmed.split(/\s+/)[0];
      const title = match ? match[2] : '';

      if (!/^https?:\/\//i.test(url) && !/^ftp:\/\//i.test(url)) continue;
      tabs.push({ url, title: title || url, groupId: -1, windowIx: 0 });
    }

    if (tabs.length) {
      collections.push({
        title: blockTitle || defaultCollectionTitle(tabs, 'hostname'),
        tabs,
        groups: [],
        windows: 1,
      });
    }
  }

  return collections;
}

/** Anything with addresses in it. The last-resort parser, and a forgiving one. */
function parseUrlList(text) {
  const tabs = [];
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Tolerate Markdown links, HTML anchors, and bare URLs on the same paste.
    const md = trimmed.match(/^\s*[-*]?\s*\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/i);
    if (md) {
      tabs.push({ url: md[2], title: md[1] || md[2], groupId: -1, windowIx: 0 });
      continue;
    }

    const href = trimmed.match(/href\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>([^<]*)</i);
    if (href) {
      tabs.push({ url: href[1], title: href[2] || href[1], groupId: -1, windowIx: 0 });
      continue;
    }

    const bare = trimmed.match(/(https?:\/\/\S+)/i);
    if (bare) {
      const url = bare[1].replace(/[).,;'"]+$/, '');
      const title = trimmed.replace(bare[1], '').replace(/^[\s|\-–—:]+/, '').trim();
      tabs.push({ url, title: title || url, groupId: -1, windowIx: 0 });
    }
  }

  if (!tabs.length) return [];
  return [
    {
      title: defaultCollectionTitle(tabs, 'hostname'),
      tabs,
      groups: [],
      windows: 1,
    },
  ];
}

/* ----------------------------------------------------------------- import --- */

/**
 * Parse without writing anything, so the UI can show a real preview and the user
 * can decide before their library changes.
 */
export function parse(text) {
  const format = detectFormat(text);

  let collections = [];
  switch (format) {
    case 'tabcove-json':
    case 'generic-json':
      collections = parseTabcoveJson(text);
      break;
    case 'onetab-text':
      collections = parseOneTabText(text);
      break;
    case 'url-list':
      collections = parseUrlList(text);
      break;
    case 'empty':
      throw new Error('There is nothing to import.');
    default:
      // Even an unrecognised blob might have addresses in it. Try before failing.
      collections = parseUrlList(text);
      if (!collections.length) {
        throw new Error(
          "That doesn't look like a tab list. Tabcove reads its own JSON exports, OneTab text, and plain lists of web addresses."
        );
      }
  }

  const tabs = collections.reduce((n, c) => n + c.tabs.length, 0);
  if (!tabs) throw new Error('No web addresses were found in that file.');

  return { format, collections, stats: { collections: collections.length, tabs } };
}

/**
 * Write parsed collections into the library.
 *
 * A restore point is taken first: importing is the operation most likely to be
 * attempted twice by someone who is already anxious about their data.
 */
export async function importCollections(collections, { mode = 'add' } = {}) {
  if (!collections.length) return { imported: 0, tabs: 0 };

  await snapshots.capture(SNAPSHOT_REASON.IMPORT, LIMITS.free.snapshots);

  if (mode === 'replace') {
    const index = await db.getIndex();
    await db.deleteCollections(index.map((e) => e.id), { force: true });
  }

  let imported = 0;
  let tabs = 0;
  const failures = [];

  for (const raw of collections) {
    try {
      // sanitiseCollection inside createCollection is the trust boundary:
      // nothing from the file reaches storage without being rebuilt field by field.
      const created = await db.createCollection({ ...raw, id: null });
      if (created.tabs.length) {
        imported++;
        tabs += created.tabs.length;
      }
    } catch (e) {
      failures.push({ title: raw.title, reason: e.message });
    }
  }

  return { imported, tabs, failures };
}

/** Parse and import in one step. Used by the paste box and the file picker. */
export async function importText(text, options = {}) {
  const { collections, format, stats } = parse(text);
  const result = await importCollections(collections, options);
  return { ...result, format, parsed: stats };
}
