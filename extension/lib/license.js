/**
 * Tabcove — licence verification seam.
 *
 * In v1.0.0 this is a COMPLETE, WORKING module that always resolves to the free
 * tier. It is not a placeholder and it is not dead code: flags.js reads it on
 * every gate check, and the free tier is a real answer.
 *
 * Its purpose is that when Pro ships in v2.0.0, only the body of `activate()`
 * changes. The interface, the storage shape, the change notification, and every
 * call site downstream are already correct. See docs/free-vs-pro-plan.md §5.
 *
 * Deliberately absent in v1: any network call. Activation will be an offline,
 * signature-verified key check, so even Pro will not require the extension to
 * phone home on every launch.
 */

import * as storage from './storage.js';

const LICENSE_KEY = 'tc:license';

/** The shape every consumer can rely on. */
const FREE_LICENSE = Object.freeze({
  tier: 'free',
  status: 'active',
  key: null,
  expiresAt: null,
  activatedAt: null,
  source: 'default',
});

const listeners = new Set();

/**
 * The current licence.
 * Always resolves — a corrupt or unrecognised stored licence degrades to free
 * rather than throwing, because a licence problem must never break the product.
 */
export async function getLicense() {
  try {
    const stored = await storage.getOne(LICENSE_KEY, null);
    if (!stored || typeof stored !== 'object') return FREE_LICENSE;

    // Expired licences fall back to free without ceremony.
    if (stored.expiresAt && Date.now() > stored.expiresAt) {
      return { ...FREE_LICENSE, status: 'expired', source: 'stored' };
    }

    if (stored.tier === 'pro' && stored.status === 'active') {
      return {
        tier: 'pro',
        status: 'active',
        key: stored.key || null,
        expiresAt: stored.expiresAt || null,
        activatedAt: stored.activatedAt || null,
        source: 'stored',
      };
    }
    return FREE_LICENSE;
  } catch {
    return FREE_LICENSE;
  }
}

/** Convenience predicate. */
export async function isPro() {
  return (await getLicense()).tier === 'pro';
}

/**
 * Activate a licence key.
 *
 * v1.0.0: Pro does not exist, so every key is declined with an honest message
 * rather than a fake success. v2.0.0 replaces this body with an offline
 * signature check; nothing else in the codebase moves.
 */
export async function activate(_key) {
  return {
    ok: false,
    reason: 'Tabcove Pro is not available yet. Everything in Tabcove today is free.',
  };
}

/** Return to the free tier. */
export async function deactivate() {
  await storage.remove(LICENSE_KEY);
  notify(FREE_LICENSE);
  return FREE_LICENSE;
}

/** Subscribe to licence changes. Returns an unsubscribe function. */
export function onLicenseChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(license) {
  for (const listener of listeners) {
    try {
      listener(license);
    } catch {
      /* a broken listener must not break the others */
    }
  }
}
