/**
 * Tabcove — feature flags.
 *
 * The single gate between Free and Pro. Call sites ask `await can('cloudSync')`
 * and never `if (isPro)`, so adding a Pro feature is one entry in this table
 * plus one call site — never a change to storage, UI plumbing, or the worker.
 *
 * Every FREE capability is declared here too. An exhaustive table means the
 * question "is this feature gated?" always has an answer in one file.
 */

import { getLicense } from './license.js';
import { LIMITS } from './constants.js';

export const FLAGS = {
  // ---- Free, v1.0.0. These never move. See docs/free-vs-pro-plan.md §1. ----
  stow: { tier: 'free', since: '1.0.0' },
  library: { tier: 'free', since: '1.0.0' },
  search: { tier: 'free', since: '1.0.0' },
  tabGroups: { tier: 'free', since: '1.0.0' },
  restorePoints: { tier: 'free', since: '1.0.0' },
  undoBin: { tier: 'free', since: '1.0.0' },
  exportAll: { tier: 'free', since: '1.0.0' },
  importAll: { tier: 'free', since: '1.0.0' },
  duplicates: { tier: 'free', since: '1.0.0' },
  commandPalette: { tier: 'free', since: '1.0.0' },
  tags: { tier: 'free', since: '1.0.0' },
  lockCollections: { tier: 'free', since: '1.0.0' },
  themes: { tier: 'free', since: '1.0.0' },
  backupReminder: { tier: 'free', since: '1.0.0' },

  // ---- Pro, planned for v2.0.0. Not built, not advertised in the v1 UI. ----
  cloudSync: { tier: 'pro', since: '2.0.0' },
  crossBrowserSync: { tier: 'pro', since: '2.0.0' },
  unlimitedSnapshots: { tier: 'pro', since: '2.0.0' },
  autoArchiveRules: { tier: 'pro', since: '2.0.0' },
  aiGrouping: { tier: 'pro', since: '2.0.0' },
  semanticSearch: { tier: 'pro', since: '2.0.0' },
  // NOT third-party analytics and NOT telemetry. This is a planned Pro feature
  // that computes statistics about the user's OWN saved tabs, locally: how often
  // a collection is reopened, which saved links have gone dead. It was called
  // `analytics` and that read as a direct contradiction of the store listing's
  // "no analytics or telemetry", so it carries an accurate name instead.
  tabInsights: { tier: 'pro', since: '2.0.0' },
  deadLinkCheck: { tier: 'pro', since: '2.0.0' },
  sharedCollections: { tier: 'pro', since: '2.0.0' },
  integrations: { tier: 'pro', since: '2.0.0' },
  customThemes: { tier: 'pro', since: '2.0.0' },
};

/**
 * Is this capability available to the current user?
 * Unknown flags return false — failing closed is the only safe default for a gate.
 */
export async function can(flag) {
  const def = FLAGS[flag];
  if (!def) return false;
  if (def.tier === 'free') return true;
  const { tier } = await getLicense();
  return tier === 'pro';
}

/** The limits table for the current tier. */
export async function limits() {
  const { tier } = await getLicense();
  return LIMITS[tier] || LIMITS.free;
}

/** Every flag resolved at once — handy for rendering a settings page in one pass. */
export async function all() {
  const { tier } = await getLicense();
  const out = {};
  for (const [name, def] of Object.entries(FLAGS)) {
    out[name] = def.tier === 'free' || tier === 'pro';
  }
  return out;
}
