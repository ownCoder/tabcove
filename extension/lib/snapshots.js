/**
 * Tabcove — restore points.
 *
 * The feature the reference product's users keep asking for. Before anything
 * destructive happens, the entire library state is snapshotted. Ten are kept,
 * rolling. Rolling back is a whole-library operation, deliberately: partial
 * rollback is where "restore" features become confusing and dangerous.
 *
 * This module reads and writes storage directly and imports nothing from db.js,
 * so db.js can depend on it without a cycle.
 */

import * as storage from './storage.js';
import { K, snapshotKey, LIMITS } from './constants.js';

/**
 * Capture the current library state.
 * @param {string} reason   one of SNAPSHOT_REASON — shown verbatim in the UI
 * @param {number} max      how many snapshots to keep
 * @returns {Promise<Object|null>} the snapshot metadata, or null if nothing to save
 */
export async function capture(reason, max = LIMITS.free.snapshots) {
  const everything = await storage.get(null);

  const index = everything[K.INDEX] || [];
  const collections = {};
  for (const [key, value] of Object.entries(everything)) {
    if (key.startsWith(K.COLLECTION_PREFIX)) collections[key] = value;
  }

  // Nothing to protect. Snapshotting an empty library just wastes a slot.
  if (!index.length && !Object.keys(collections).length) return null;

  // Snapshot keys are timestamps. Two captures inside the same millisecond —
  // an import immediately after a delete, say — would collide on the key and
  // the second would silently destroy the first. Step forward until free, so
  // the restore-point list can never lose an entry to a clock collision.
  let ts = Date.now();
  while (everything[snapshotKey(ts)]) ts++;

  const tabCount = index.reduce((n, e) => n + (e.count || 0), 0);

  const snapshot = {
    ts,
    reason,
    index,
    collections,
    stats: { collections: index.length, tabs: tabCount },
  };

  await storage.set({ [snapshotKey(ts)]: snapshot });
  await prune(max);

  return { ts, reason, stats: snapshot.stats };
}

/** All snapshots, newest first, without their payloads. */
export async function list() {
  const everything = await storage.get(null);
  const out = [];
  for (const [key, value] of Object.entries(everything)) {
    if (!key.startsWith(K.SNAPSHOT_PREFIX) || !value) continue;
    out.push({
      ts: value.ts,
      reason: value.reason,
      stats: value.stats || { collections: 0, tabs: 0 },
      bytes: roughSize(value),
    });
  }
  out.sort((a, b) => b.ts - a.ts);
  return out;
}

/**
 * Roll the whole library back to a snapshot.
 *
 * A snapshot of the *current* state is taken first, so rolling back is itself
 * undoable. Without that, "restore" is a second way to lose data.
 */
export async function restore(ts) {
  const snap = await storage.getOne(snapshotKey(ts), null);
  if (!snap) throw new Error('That restore point is no longer available.');

  await capture('Before rolling back to an earlier restore point');

  // Remove the collections that exist now but not in the snapshot, otherwise a
  // rollback would leave newer collections behind and the index would disagree.
  const everything = await storage.get(null);
  const staleKeys = Object.keys(everything).filter(
    (k) => k.startsWith(K.COLLECTION_PREFIX) && !(k in snap.collections)
  );
  if (staleKeys.length) await storage.remove(staleKeys);

  await storage.set({ ...snap.collections, [K.INDEX]: snap.index });

  return snap.stats;
}

/** Delete one snapshot. */
export async function drop(ts) {
  await storage.remove(snapshotKey(ts));
}

/** Keep only the newest `max` snapshots. */
export async function prune(max = LIMITS.free.snapshots) {
  if (!Number.isFinite(max)) return 0;
  const all = await list();
  const doomed = all.slice(max);
  if (doomed.length) {
    await storage.remove(doomed.map((s) => snapshotKey(s.ts)));
  }
  return doomed.length;
}

/** Delete every snapshot. */
export async function clear() {
  const everything = await storage.get(null);
  const keys = Object.keys(everything).filter((k) => k.startsWith(K.SNAPSHOT_PREFIX));
  if (keys.length) await storage.remove(keys);
  return keys.length;
}

/** Cheap byte estimate for the restore-point list. Not exact, and does not need to be. */
function roughSize(value) {
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}
