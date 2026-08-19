/**
 * Tabcove — the collection store.
 *
 * The architectural heart of the product. Two rules govern everything here:
 *
 *   1. ONE STORAGE RECORD PER COLLECTION, plus a small index.
 *      Saving 20 tabs writes ~2 KB, not the whole library. A corrupt record
 *      costs one collection, not everything. This is the direct answer to the
 *      category's defining failure mode.
 *
 *   2. NOTHING DESTRUCTIVE HAPPENS WITHOUT A RESTORE POINT FIRST.
 *      snapshots.capture() runs before every delete, wipe, import, and migration.
 *
 * The index (`tc:index`) holds only what the library list needs to render, so
 * the list view never has to read a single collection record.
 */

import * as storage from './storage.js';
import * as snapshots from './snapshots.js';
import * as trash from './trash.js';
import {
  K,
  collectionKey,
  SCHEMA_VERSION,
  SNAPSHOT_REASON,
  LIMITS,
  EXCLUDED_SCHEMES,
} from './constants.js';

/* ------------------------------------------------------------------ ids --- */

/**
 * Short, URL-safe, collision-checked id.
 * 6 base36 chars = ~2.1 billion values; we still check the index, because
 * "probably unique" is not a thing you want in a storage key.
 */
function rawId() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
}

function uniqueId(index) {
  const taken = new Set(index.map((e) => e.id));
  let id = rawId();
  let guard = 0;
  while (taken.has(id) && guard++ < 50) id = rawId();
  return id;
}

/* ------------------------------------------------------------- the index --- */

/** The index, always an array. A missing or corrupt index reads as empty. */
export async function getIndex() {
  const idx = await storage.getOne(K.INDEX, []);
  return Array.isArray(idx) ? idx : [];
}

async function writeIndex(index) {
  await storage.set({ [K.INDEX]: index });
}

/** Strip a full collection down to the fields the index carries. */
function toIndexEntry(collection) {
  return {
    id: collection.id,
    title: collection.title,
    count: collection.tabs.length,
    groups: (collection.groups || []).length,
    windows: collection.windows || 1,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    rev: collection.rev,
    pinned: !!collection.pinned,
    locked: !!collection.locked,
    tags: collection.tags || [],
  };
}

/* ------------------------------------------------------------ validation --- */

/**
 * Normalise one tab into the stored shape.
 * Returns null for anything we refuse to store.
 */
function sanitiseTab(tab, { allowFileUrls = false } = {}) {
  if (!tab || typeof tab.url !== 'string' || !tab.url) return null;

  let scheme;
  try {
    scheme = new URL(tab.url).protocol;
  } catch {
    return null; // not a parseable URL — never store it
  }

  if (EXCLUDED_SCHEMES.includes(scheme)) return null;
  if (scheme === 'file:' && !allowFileUrls) return null;

  return {
    url: tab.url.slice(0, 4000), // pathological URLs exist; 4 KB is generous
    title: String(tab.title || tab.url).slice(0, 500),
    pinned: !!tab.pinned,
    groupId: Number.isInteger(tab.groupId) ? tab.groupId : -1,
    windowIx: Number.isInteger(tab.windowIx) ? tab.windowIx : 0,
    savedAt: Number.isFinite(tab.savedAt) ? tab.savedAt : Date.now(),
  };
}

/**
 * Normalise a whole collection.
 *
 * Also the prototype-pollution defence for imports: the output object is built
 * from scratch with a fixed field list, so `__proto__` and friends in untrusted
 * JSON cannot reach anything.
 */
export function sanitiseCollection(raw, { allowFileUrls = false } = {}) {
  const now = Date.now();
  const tabs = Array.isArray(raw?.tabs)
    ? raw.tabs.map((t) => sanitiseTab(t, { allowFileUrls })).filter(Boolean)
    : [];

  const groups = Array.isArray(raw?.groups)
    ? raw.groups.slice(0, 64).map((g) => ({
        title: String(g?.title || '').slice(0, 200),
        color: typeof g?.color === 'string' ? g.color : 'grey',
        collapsed: !!g?.collapsed,
      }))
    : [];

  return {
    id: typeof raw?.id === 'string' && raw.id ? raw.id.slice(0, 32) : null,
    title: String(raw?.title || 'Untitled collection').slice(0, 200),
    tabs,
    groups,
    windows: Number.isInteger(raw?.windows) && raw.windows > 0 ? raw.windows : 1,
    createdAt: Number.isFinite(raw?.createdAt) ? raw.createdAt : now,
    updatedAt: now,
    rev: Number.isInteger(raw?.rev) ? raw.rev : 1,
    pinned: !!raw?.pinned,
    locked: !!raw?.locked,
    tags: Array.isArray(raw?.tags)
      ? raw.tags.slice(0, 16).map((t) => String(t).slice(0, 40)).filter(Boolean)
      : [],
    note: String(raw?.note || '').slice(0, 2000),
  };
}

/* ------------------------------------------------------------------- CRUD --- */

/**
 * Create a collection.
 *
 * Order matters: the record is written BEFORE the index is patched. If the
 * second write fails we are left with an orphan record — invisible and harmless,
 * and reclaimed by reconcile(). The reverse order would leave a dangling index
 * entry pointing at nothing, which is a visible, confusing failure.
 */
export async function createCollection(raw, opts = {}) {
  const index = await getIndex();
  const collection = sanitiseCollection(raw, opts);
  collection.id = collection.id && !index.some((e) => e.id === collection.id)
    ? collection.id
    : uniqueId(index);
  collection.rev = 1;

  await storage.set({ [collectionKey(collection.id)]: collection });
  index.unshift(toIndexEntry(collection));
  await writeIndex(index);

  return collection;
}

/** Read one collection record, or null. */
export async function getCollection(id) {
  return storage.getOne(collectionKey(id), null);
}

/** Read many collection records at once — one storage round trip. */
export async function getCollections(ids) {
  if (!ids.length) return [];
  const out = await storage.get(ids.map(collectionKey));
  return ids.map((id) => out[collectionKey(id)]).filter(Boolean);
}

/**
 * Patch a collection.
 * @param {string} id
 * @param {Object|Function} patch  an object to merge, or (collection) => collection
 */
export async function updateCollection(id, patch) {
  const current = await getCollection(id);
  if (!current) throw new Error('That collection no longer exists.');

  const merged = typeof patch === 'function' ? patch({ ...current }) : { ...current, ...patch };
  const next = sanitiseCollection(merged);
  next.id = id;
  next.createdAt = current.createdAt;
  next.rev = (current.rev || 1) + 1; // monotonic — the conflict seam for Pro sync

  await storage.set({ [collectionKey(id)]: next });

  const index = await getIndex();
  const at = index.findIndex((e) => e.id === id);
  if (at >= 0) index[at] = toIndexEntry(next);
  else index.unshift(toIndexEntry(next));
  await writeIndex(index);

  return next;
}

/**
 * Delete a collection — into the bin, never off a cliff.
 * Locked collections refuse deletion; that is the whole point of the lock.
 */
export async function deleteCollection(id, { force = false } = {}) {
  const collection = await getCollection(id);
  if (!collection) return null;
  if (collection.locked && !force) {
    throw new Error('That collection is locked. Unlock it first.');
  }

  await snapshots.capture(SNAPSHOT_REASON.DELETE, LIMITS.free.snapshots);
  await trash.put(collection);
  await storage.remove(collectionKey(id));

  const index = await getIndex();
  await writeIndex(index.filter((e) => e.id !== id));

  return collection;
}

/** Delete several collections with a single snapshot rather than one each. */
export async function deleteCollections(ids, { force = false } = {}) {
  if (!ids.length) return { deleted: 0, skipped: [] };

  await snapshots.capture(SNAPSHOT_REASON.BULK_DELETE, LIMITS.free.snapshots);

  const records = await getCollections(ids);
  const skipped = [];
  const doomed = [];

  for (const c of records) {
    if (c.locked && !force) {
      skipped.push(c.title);
      continue;
    }
    await trash.put(c);
    doomed.push(c.id);
  }

  if (doomed.length) {
    await storage.remove(doomed.map(collectionKey));
    const index = await getIndex();
    await writeIndex(index.filter((e) => !doomed.includes(e.id)));
  }

  return { deleted: doomed.length, skipped };
}

/** Pull a collection back out of the bin. */
export async function restoreFromTrash(id) {
  const item = await trash.get(id);
  if (!item || !item.collection) throw new Error('That item is no longer in the bin.');

  const index = await getIndex();
  const collection = sanitiseCollection(item.collection);
  // The original id may have been reused since. Only mint a new one if so.
  collection.id = index.some((e) => e.id === item.collection.id)
    ? uniqueId(index)
    : item.collection.id;

  await storage.set({ [collectionKey(collection.id)]: collection });
  index.unshift(toIndexEntry(collection));
  await writeIndex(index);
  await trash.drop(id);

  return collection;
}

/**
 * Re-create a collection with a known id. Used by the undo toast to make an
 * "undo delete" land back where the user expects rather than at the top.
 */
export async function reinsertCollection(collection, position = 0) {
  const index = await getIndex();
  const clean = sanitiseCollection(collection);
  clean.id = index.some((e) => e.id === collection.id) ? uniqueId(index) : collection.id;

  await storage.set({ [collectionKey(clean.id)]: clean });
  index.splice(Math.max(0, Math.min(position, index.length)), 0, toIndexEntry(clean));
  await writeIndex(index);
  await trash.drop(collection.id);

  return clean;
}

/* --------------------------------------------------------------- tab ops --- */

/** Remove one tab from a collection. Deletes the collection when it empties. */
export async function removeTab(collectionId, tabIndex) {
  const collection = await getCollection(collectionId);
  if (!collection) return null;

  const removed = collection.tabs[tabIndex];
  if (!removed) return null;

  collection.tabs.splice(tabIndex, 1);

  if (!collection.tabs.length) {
    await deleteCollection(collectionId, { force: true });
    return { removed, collectionDeleted: true };
  }

  await updateCollection(collectionId, collection);
  return { removed, collectionDeleted: false };
}

/** Move tabs from one collection into another, then tidy up the source. */
export async function moveTabs(fromId, tabIndexes, toId) {
  const [from, to] = await Promise.all([getCollection(fromId), getCollection(toId)]);
  if (!from || !to) throw new Error('One of those collections no longer exists.');

  const wanted = new Set(tabIndexes);
  const moving = from.tabs.filter((_, i) => wanted.has(i));
  if (!moving.length) return { moved: 0 };

  // Group indexes are collection-local, so they must be remapped, not copied.
  const remapped = moving.map((t) => {
    if (t.groupId < 0) return { ...t, groupId: -1 };
    const group = from.groups[t.groupId];
    if (!group) return { ...t, groupId: -1 };
    let at = to.groups.findIndex((g) => g.title === group.title && g.color === group.color);
    if (at < 0) at = to.groups.push({ ...group }) - 1;
    return { ...t, groupId: at };
  });

  to.tabs.push(...remapped);
  from.tabs = from.tabs.filter((_, i) => !wanted.has(i));

  await updateCollection(toId, to);
  if (from.tabs.length) await updateCollection(fromId, from);
  else await deleteCollection(fromId, { force: true });

  return { moved: moving.length };
}

/* ------------------------------------------------------------ duplicates --- */

/**
 * Find URLs saved more than once across the whole library.
 * Returns the biggest offenders first, which is the order a user wants to act in.
 */
export async function findDuplicates() {
  const index = await getIndex();
  const all = await getCollections(index.map((e) => e.id));

  const seen = new Map(); // url -> [{collectionId, collectionTitle, tabIndex, title}]
  for (const c of all) {
    c.tabs.forEach((t, i) => {
      const key = normaliseUrl(t.url);
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push({
        collectionId: c.id,
        collectionTitle: c.title,
        collectionCreatedAt: c.createdAt || 0,
        tabIndex: i,
        title: t.title,
        url: t.url,
      });
    });
  }

  const dupes = [];
  for (const [url, hits] of seen) {
    if (hits.length < 2) continue;
    // Oldest first. The index is newest-first, so without this the "keep the
    // first copy" rule in mergeDuplicates would keep the newest instead — the
    // opposite of what a user means by "the original".
    hits.sort((a, b) => a.collectionCreatedAt - b.collectionCreatedAt);
    dupes.push({ url, hits, extra: hits.length - 1 });
  }
  dupes.sort((a, b) => b.extra - a.extra);

  return {
    groups: dupes,
    totalExtra: dupes.reduce((n, d) => n + d.extra, 0),
  };
}

/**
 * Keep the oldest copy of every duplicated URL and drop the rest.
 * "Oldest" is deliberate: the first time you saved something is the copy with
 * the context you remember.
 */
export async function mergeDuplicates() {
  const { groups } = await findDuplicates();
  if (!groups.length) return { removed: 0 };

  await snapshots.capture(SNAPSHOT_REASON.MERGE, LIMITS.free.snapshots);

  // Collect removals per collection, then apply once per collection.
  const removals = new Map(); // collectionId -> Set(tabIndex)
  for (const group of groups) {
    // hits are sorted oldest-first by findDuplicates, so [0] is the original.
    const [, ...rest] = group.hits;
    for (const hit of rest) {
      if (!removals.has(hit.collectionId)) removals.set(hit.collectionId, new Set());
      removals.get(hit.collectionId).add(hit.tabIndex);
    }
  }

  let removed = 0;
  for (const [id, indexes] of removals) {
    const c = await getCollection(id);
    if (!c) continue;
    const before = c.tabs.length;
    c.tabs = c.tabs.filter((_, i) => !indexes.has(i));
    removed += before - c.tabs.length;
    if (c.tabs.length) await updateCollection(id, c);
    else await deleteCollection(id, { force: true });
  }

  return { removed };
}

/** Ignore trailing slashes and hash fragments when comparing URLs. */
function normaliseUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

/* ----------------------------------------------------------------- stats --- */

export async function getStats() {
  const index = await getIndex();
  return {
    collections: index.length,
    tabs: index.reduce((n, e) => n + (e.count || 0), 0),
    groups: index.reduce((n, e) => n + (e.groups || 0), 0),
    pinned: index.filter((e) => e.pinned).length,
    locked: index.filter((e) => e.locked).length,
    tags: [...new Set(index.flatMap((e) => e.tags || []))].sort(),
    newest: index.reduce((t, e) => Math.max(t, e.updatedAt || 0), 0),
  };
}

/* ------------------------------------------------------------ housekeeping --- */

/**
 * Repair disagreements between the index and the records.
 *
 * Runs on service-worker startup and on library load. Two failure modes exist,
 * both benign by construction, and both fixed here:
 *
 *   orphan   — a record with no index entry  -> re-index it (nothing is lost)
 *   dangling — an index entry with no record -> drop the entry (it showed nothing)
 */
export async function reconcile() {
  const everything = await storage.get(null);
  const index = Array.isArray(everything[K.INDEX]) ? everything[K.INDEX] : [];

  const recordIds = new Set();
  for (const key of Object.keys(everything)) {
    if (key.startsWith(K.COLLECTION_PREFIX)) {
      recordIds.add(key.slice(K.COLLECTION_PREFIX.length));
    }
  }

  const indexIds = new Set(index.map((e) => e.id));
  let changed = false;
  const report = { orphansAdopted: 0, danglingRemoved: 0 };

  // Dangling entries first — they are what a user would actually notice.
  const kept = index.filter((e) => {
    if (recordIds.has(e.id)) return true;
    report.danglingRemoved++;
    changed = true;
    return false;
  });

  // Orphan records get their index entry rebuilt from the record itself.
  for (const id of recordIds) {
    if (indexIds.has(id)) continue;
    const record = everything[collectionKey(id)];
    if (!record || !Array.isArray(record.tabs)) continue;
    kept.push(toIndexEntry(sanitiseCollection({ ...record, id })));
    report.orphansAdopted++;
    changed = true;
  }

  if (changed) {
    kept.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    await writeIndex(kept);
  }

  return report;
}

/* ------------------------------------------------------------ migrations --- */

/**
 * Schema migrations. Append new entries; never edit an existing one.
 * Each runs inside a snapshot-protected block, and the schema version is only
 * advanced after the migration resolves — so a failed migration is recoverable
 * rather than terminal. That is the exact failure mode that cost the reference
 * product its users' data in December 2025.
 */
const migrations = {
  1: async () => {
    // Establishes the v1 key space. New installs land here with nothing to do.
    const meta = await storage.getOne(K.META, null);
    if (!meta) {
      await storage.set({
        [K.META]: {
          schema: 0,
          installedAt: Date.now(),
          lastBackupAt: 0,
          lastBackupCount: 0,
        },
      });
    }
    const index = await storage.getOne(K.INDEX, null);
    if (!Array.isArray(index)) await storage.set({ [K.INDEX]: [] });
  },
};

/** Read the meta record, creating it if absent. */
export async function getMeta() {
  const meta = await storage.getOne(K.META, null);
  if (meta) return meta;
  const fresh = { schema: 0, installedAt: Date.now(), lastBackupAt: 0, lastBackupCount: 0 };
  await storage.set({ [K.META]: fresh });
  return fresh;
}

export async function setMeta(patch) {
  const meta = await getMeta();
  const next = { ...meta, ...patch };
  await storage.set({ [K.META]: next });
  return next;
}

/**
 * Bring storage up to the current schema. Safe to call on every startup.
 */
export async function init() {
  const meta = await getMeta();
  let from = Number.isInteger(meta.schema) ? meta.schema : 0;

  if (from >= SCHEMA_VERSION) {
    await reconcile();
    return { migrated: false, schema: from };
  }

  if (from > 0) {
    // Only snapshot when there is real data to protect; a fresh install has none.
    await snapshots.capture(SNAPSHOT_REASON.MIGRATE, LIMITS.free.snapshots);
  }

  for (let v = from + 1; v <= SCHEMA_VERSION; v++) {
    const step = migrations[v];
    if (!step) continue;
    await step();
    await setMeta({ schema: v }); // advanced only after the step resolves
    from = v;
  }

  await reconcile();
  return { migrated: true, schema: from };
}
