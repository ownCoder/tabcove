/**
 * Tabcove — the undo bin.
 *
 * Deleting a collection does not remove it; it moves it to a tombstone record
 * that survives for 30 days. This module owns *only* the tombstones — db.js
 * orchestrates the move in and out, which keeps the two modules acyclic.
 */

import * as storage from './storage.js';
import { K, trashKey } from './constants.js';

/**
 * Move a collection record into the bin.
 * @param {Object} collection  the full collection record
 */
export async function put(collection) {
  await storage.set({
    [trashKey(collection.id)]: {
      collection,
      deletedAt: Date.now(),
    },
  });
}

/** Every binned item, newest deletion first. */
export async function list() {
  const everything = await storage.get(null);
  const items = [];
  for (const [key, value] of Object.entries(everything)) {
    if (!key.startsWith(K.TRASH_PREFIX)) continue;
    if (!value || !value.collection) continue;
    items.push(value);
  }
  items.sort((a, b) => b.deletedAt - a.deletedAt);
  return items;
}

/** One binned item, or null. */
export async function get(id) {
  return storage.getOne(trashKey(id), null);
}

/** Remove a tombstone permanently. */
export async function drop(id) {
  await storage.remove(trashKey(id));
}

/** How many items are in the bin. Cheap enough to call on every render. */
export async function count() {
  return (await list()).length;
}

/**
 * Delete tombstones older than `days`.
 * Called from the daily alarm in the service worker and on library load.
 * @returns {Promise<number>} how many were swept
 */
export async function sweep(days = 30) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const everything = await storage.get(null);
  const expired = [];
  for (const [key, value] of Object.entries(everything)) {
    if (!key.startsWith(K.TRASH_PREFIX)) continue;
    if (value && typeof value.deletedAt === 'number' && value.deletedAt < cutoff) {
      expired.push(key);
    }
  }
  if (expired.length) await storage.remove(expired);
  return expired.length;
}

/** Empty the bin. Guarded by a typed confirmation in the UI. */
export async function empty() {
  const everything = await storage.get(null);
  const keys = Object.keys(everything).filter((k) => k.startsWith(K.TRASH_PREFIX));
  if (keys.length) await storage.remove(keys);
  return keys.length;
}
