/**
 * Tabcove — shared constants.
 *
 * Everything that another module might otherwise hard-code lives here: storage
 * keys, limits, enums, and the schema version. Keeping them in one place is what
 * makes the migration runner in db.js safe to reason about.
 */

/** Bumped only when the on-disk shape of a record changes. See db.js migrations. */
export const SCHEMA_VERSION = 1;

/** Product version — kept in sync with manifest.json by tools/build.py. */
export const APP_VERSION = '1.0.0';

/**
 * Storage key space. Every key is prefixed `tc:` so a future co-tenant (or a
 * debugging session in the console) can tell our records apart at a glance.
 */
export const K = {
  META: 'tc:meta',
  SETTINGS: 'tc:settings',
  INDEX: 'tc:index',
  COLLECTION_PREFIX: 'tc:c:',
  SNAPSHOT_PREFIX: 'tc:snap:',
  TRASH_PREFIX: 'tc:trash:',
};

export const collectionKey = (id) => K.COLLECTION_PREFIX + id;
export const snapshotKey = (ts) => K.SNAPSHOT_PREFIX + ts;
export const trashKey = (id) => K.TRASH_PREFIX + id;

/**
 * Tier-aware limits.
 *
 * `collections` and `tabs` are Infinity in BOTH tiers on purpose: the free tier
 * is a complete product, never a crippled Pro. See docs/free-vs-pro-plan.md.
 */
export const LIMITS = {
  free: {
    snapshots: 10,
    trashDays: 30,
    collections: Infinity,
    tabs: Infinity,
  },
  pro: {
    snapshots: Infinity,
    trashDays: 365,
    collections: Infinity,
    tabs: Infinity,
  },
};

/** Reasons a snapshot gets taken. Surfaced verbatim in the restore-point list. */
export const SNAPSHOT_REASON = {
  DELETE: 'Before deleting a collection',
  BULK_DELETE: 'Before deleting several collections',
  EMPTY_TRASH: 'Before emptying the bin',
  WIPE: 'Before deleting everything',
  IMPORT: 'Before importing',
  MIGRATE: 'Before a version upgrade',
  MERGE: 'Before merging duplicates',
  MANUAL: 'Created by you',
};

/**
 * URL schemes an extension is actually allowed to reopen.
 *
 * Chrome silently refuses `chrome://`, `chrome-extension://`, `devtools://` and
 * Web Store URLs from `tabs.create`. Capturing them is fine; restoring them is
 * not, so we filter at both ends and *tell the user* rather than failing quietly.
 */
export const RESTORABLE_SCHEMES = ['http:', 'https:', 'ftp:', 'file:'];

/** Schemes we refuse to capture at all — they are never useful in an archive. */
export const EXCLUDED_SCHEMES = [
  'chrome:',
  'chrome-extension:',
  'chrome-untrusted:',
  'devtools:',
  'edge:',
  'about:',
  'view-source:',
  'data:',
  'javascript:',
  'blob:',
  'filesystem:',
];

/** Chrome's tab-group colour names, in the order Chrome itself lists them. */
export const GROUP_COLORS = [
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
  'orange',
];

/** Hex values matching Chrome's group colours closely enough to be recognisable. */
export const GROUP_COLOR_HEX = {
  grey: '#5F6368',
  blue: '#1A73E8',
  red: '#D93025',
  yellow: '#F9AB00',
  green: '#1E8E3E',
  pink: '#D01884',
  purple: '#9334E6',
  cyan: '#007B83',
  orange: '#FA903E',
};

/** How many tabs we open per batch when restoring. Keeps Chrome responsive. */
export const RESTORE_BATCH_SIZE = 8;

/** Milliseconds we pause between restore batches. */
export const RESTORE_BATCH_DELAY = 40;

/** Search tuning. */
export const SEARCH = {
  DEBOUNCE_MS: 90,
  MAX_RESULTS: 300,
  YIELD_EVERY: 2000,
};

/** Undo toast lifetime, in milliseconds. */
export const UNDO_WINDOW_MS = 10000;

/** chrome.alarms names. */
export const ALARM = {
  TRASH_SWEEP: 'tc-trash-sweep',
  BACKUP_CHECK: 'tc-backup-check',
};

/** Storage meter thresholds, as a fraction of the soft budget. */
export const QUOTA = {
  /** Soft budget used for the meter. unlimitedStorage lifts the real cap, but a
   *  number users can reason about is more useful than "unlimited". */
  SOFT_BUDGET_BYTES: 10 * 1024 * 1024,
  WARN_AT: 0.75,
  CRITICAL_AT: 0.95,
};

/** Export formats offered everywhere export is offered. */
export const EXPORT_FORMATS = ['json', 'html', 'markdown', 'csv', 'text'];

/** Default settings. settings.js merges these under whatever is stored. */
export const DEFAULT_SETTINGS = {
  // Stowing
  closeAfterStow: true,
  keepPinnedOpen: true,
  skipExcluded: true,
  allowFileUrls: false,
  defaultTitleStyle: 'date', // 'date' | 'count' | 'hostname'

  // Restoring
  consumeOnRestore: false, // non-destructive by default — the library is a library
  restoreInNewWindow: false,
  restoreGroups: true,
  restorePinned: true,
  batchSize: RESTORE_BATCH_SIZE,

  // Appearance
  theme: 'system', // 'system' | 'light' | 'dark'
  density: 'comfortable', // 'comfortable' | 'compact'
  showFavicons: true,
  expandFirstCollection: true,

  // Backup
  backupReminder: true,
  backupReminderThreshold: 200, // tabs added since the last export

  // Housekeeping
  trashDays: 30,
};
