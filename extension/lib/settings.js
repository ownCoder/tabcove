/**
 * Tabcove — user settings.
 *
 * Defaults live in constants.js; stored values are merged over them, and unknown
 * keys are dropped. That means adding a setting in a future version needs no
 * migration: existing users simply pick up the new default.
 */

import * as storage from './storage.js';
import { K, DEFAULT_SETTINGS } from './constants.js';

let cache = null;

/** Read settings, merged over defaults. Cached; the cache is invalidated by onChanged. */
export async function getSettings() {
  if (cache) return cache;
  const stored = await storage.getOne(K.SETTINGS, {});
  cache = normalise(stored);
  return cache;
}

/** Read one setting. */
export async function getSetting(key) {
  const s = await getSettings();
  return s[key];
}

/** Merge a patch into settings and persist. */
export async function setSettings(patch) {
  const current = await getSettings();
  const next = normalise({ ...current, ...patch });
  await storage.set({ [K.SETTINGS]: next });
  cache = next;
  return next;
}

/** Reset every setting to its default. */
export async function resetSettings() {
  await storage.set({ [K.SETTINGS]: { ...DEFAULT_SETTINGS } });
  cache = { ...DEFAULT_SETTINGS };
  return cache;
}

/**
 * Keep only known keys, and coerce each to the type of its default. A stored
 * string "true" from a hand-edited storage entry should not become a truthy
 * boolean setting by accident.
 */
function normalise(raw) {
  const out = {};
  for (const [key, fallback] of Object.entries(DEFAULT_SETTINGS)) {
    const value = raw?.[key];
    if (value === undefined || value === null) {
      out[key] = fallback;
      continue;
    }
    if (typeof fallback === 'boolean') out[key] = !!value;
    else if (typeof fallback === 'number') {
      const n = Number(value);
      out[key] = Number.isFinite(n) ? n : fallback;
    } else if (typeof fallback === 'string') out[key] = String(value);
    else out[key] = value;
  }
  return out;
}

/** Drop the cache. Wired to storage.onChanged by every page that reads settings. */
export function invalidate() {
  cache = null;
}

/**
 * Apply theme and density to a document.
 * Called on every page load and whenever settings change, so a theme switch in
 * options is reflected in an already-open library tab without a reload.
 */
export function applyAppearance(doc, settings) {
  const root = doc.documentElement;
  const theme = settings.theme === 'system' ? '' : settings.theme;
  if (theme) root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
  root.setAttribute('data-density', settings.density || 'comfortable');
}
