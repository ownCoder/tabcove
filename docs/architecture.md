# Technical Architecture — Tabcove

**Version:** 1.0
**Date:** 19 August 2026
**Manifest:** V3
**Minimum Chrome:** 114 (required for `chrome.tabGroups`; `sidePanel` is deliberately not used in v1)

---

## 1. Architectural stance

Four decisions determine everything else.

### 1.1 No build step

The extension is plain ES modules. No bundler, no transpiler, no minifier, no framework, no `node_modules` in the shipped package.

**Why:**

- **Review speed and safety.** Chrome reviewers read the exact bytes that execute. Minified or bundled code is the single largest cause of slow reviews and "obfuscated code" rejections.
- **Payload.** The whole extension is under 120 KB unpacked. React plus a bundler would be 45× that for a UI of four screens.
- **Longevity.** A no-dependency extension cannot be broken by a supply-chain compromise, which in this exact category is not hypothetical — The Great Suspender was removed from the store in 2021 after new owners shipped remote code.
- **Startup.** No hydration, no framework boot. The popup paints in under 40 ms.

### 1.2 Local-first, network-never

There is no `fetch`, no `XMLHttpRequest`, no `WebSocket`, no `EventSource`, no `navigator.sendBeacon`, and no remotely-hosted script anywhere in the extension. `tools/validate.py` fails the build if any of those tokens appear. This is a checked invariant, not a promise.

Consequence: the manifest declares **no `host_permissions`** and **no `content_scripts`**. The extension can never read, modify, or observe the content of any page.

### 1.3 Sharded storage, never a monolithic blob

The single most important architectural decision, and the direct answer to the reference product's defining failure.

```
Monolithic (OneTab-style)        Sharded (Tabcove)
──────────────────────────       ──────────────────────────────────
storage["state"] = {             storage["tc:index"]  = [ {id,title,n,ts}, … ]   ~8 KB
  lists: [ …everything… ]        storage["tc:c:a1b2"] = { …one collection… }     ~2 KB
}                                storage["tc:c:c3d4"] = { …one collection… }     ~2 KB
                                 storage["tc:snap:…"] = { …restore point… }
Save 20 tabs  → rewrite 4 MB     Save 20 tabs  → write ~2 KB + patch the index
Read one list → parse 4 MB       Read one list → parse ~2 KB
One corrupt byte → lose all      One corrupt record → lose one collection
```

Effects: writes stay O(one collection) instead of O(library); the library list renders from an index that stays small; and blast radius on corruption is one record.

### 1.4 Durability as a first-class subsystem

Three mechanisms, always on, no configuration required:

1. **Restore points** (`lib/snapshots.js`) — before any destructive operation, the index and the affected records are snapshotted. Ten are kept, rolling.
2. **Undo bin** (`lib/trash.js`) — deleted collections move to a tombstoned record with a 30-day TTL, swept by an alarm.
3. **Undo toast** — a 10-second in-memory inverse operation for the immediately previous action.

---

## 2. Component map

```
┌──────────────────────────────────────────────────────────────────────────┐
│  CHROME                                                                  │
│                                                                          │
│  ┌────────────────┐   ┌─────────────────┐   ┌───────────────────────┐    │
│  │ Toolbar action │   │ Keyboard cmds   │   │ Context menu          │    │
│  └───────┬────────┘   └────────┬────────┘   └───────────┬───────────┘    │
│          │                     │                        │                │
│          ▼                     ▼                        ▼                │
│  ┌───────────────┐   ┌──────────────────────────────────────────────┐    │
│  │  POPUP        │   │  SERVICE WORKER  (background/service-worker) │    │
│  │  popup.html   │   │  • onInstalled → welcome, context menus      │    │
│  │  popup.js     │   │  • commands    → stow-all / stow-tab / lib   │    │
│  └───────┬───────┘   │  • alarms      → trash sweep, backup nudge   │    │
│          │           │  • no state of its own; may be killed anytime│    │
│          │           └───────────────────────┬──────────────────────┘    │
│          │                                   │                          │
│  ┌───────▼───────┐  ┌──────────────┐  ┌──────▼───────┐                   │
│  │  LIBRARY      │  │  OPTIONS     │  │  WELCOME     │                   │
│  │  library.html │  │ options.html │  │ welcome.html │                   │
│  └───────┬───────┘  └──────┬───────┘  └──────┬───────┘                   │
│          │                 │                 │                          │
│          └─────────────────┴─────────────────┘                          │
│                            │                                            │
│            ┌───────────────▼────────────────────────────────┐            │
│            │  lib/  — shared ES modules, imported directly  │            │
│            │  db · storage · snapshots · trash · capture ·  │            │
│            │  restore · search · exporter · importer ·      │            │
│            │  settings · flags · license · virtual-list ·   │            │
│            │  toast · dom · format · constants              │            │
│            └───────────────┬────────────────────────────────┘            │
│                            │                                            │
│            ┌───────────────▼───────────────┐  ┌──────────────────────┐   │
│            │  chrome.storage.local         │  │  chrome.tabs         │   │
│            │  (unlimitedStorage)           │  │  chrome.tabGroups    │   │
│            └───────────────────────────────┘  │  chrome.windows      │   │
│                                               └──────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

**Note on the message bus:** every UI surface imports `lib/db.js` and talks to `chrome.storage` directly. There is no message-passing round trip through the service worker for reads or writes. This matters under MV3 because the service worker is killed aggressively (~30 s idle); routing storage through it would mean paying a worker cold start on every click. The worker handles only what genuinely must be global: install, commands, context menus, and alarms.

Cross-surface consistency is maintained by `chrome.storage.onChanged`, which every open surface subscribes to. Delete a collection in the library and an open options page updates without any explicit messaging.

---

## 3. Manifest V3

```jsonc
{
  "manifest_version": 3,
  "name": "Tabcove — Tab Manager & Session Saver",
  "short_name": "Tabcove",
  "version": "1.0.0",
  "minimum_chrome_version": "114",
  "permissions": ["tabs", "tabGroups", "storage", "unlimitedStorage", "contextMenus", "favicon", "alarms"],
  "background": { "service_worker": "background/service-worker.js", "type": "module" },
  "action":     { "default_popup": "popup/popup.html" },
  "options_page": "options/options.html",
  "commands":   { /* 3 suggested keys */ },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; base-uri 'none'"
  }
}
```

**Not present, deliberately:** `host_permissions`, `content_scripts`, `web_accessible_resources`, `externally_connectable`, `scripting`, `downloads`, `history`, `bookmarks`, `identity`, `declarativeNetRequest`.

Full per-permission justification is in [`compliance.md`](compliance.md). In brief:

| Permission | Why it is unavoidable |
|---|---|
| `tabs` | Reading `tab.title` and `tab.url` is the product. Without it, a saved tab is an untitled blank. |
| `tabGroups` | Reading and re-creating group names and colours — the round-trip fidelity competitors lack. |
| `storage` | Where the library lives. |
| `unlimitedStorage` | `storage.local` caps at 10 MB otherwise, which a heavy user reaches at roughly 25,000 saved tabs. Removing the cap is the difference between "it got slow and then it stopped" and "it kept working". |
| `contextMenus` | Right-click stow actions. |
| `favicon` | Renders favicons from Chrome's **local** cache via `_favicon/`. The alternative — a third-party favicon service — would mean sending every saved URL to a remote server. This permission exists specifically to protect privacy. |
| `alarms` | Sweeping the 30-day undo bin and checking whether a backup reminder is due. MV3 service workers are killed, so `setTimeout` is not an option. |

---

## 4. Storage design

### 4.1 Key space

| Key | Shape | Typical size | Purpose |
|---|---|---|---|
| `tc:meta` | `{ schema, installedAt, lastBackupAt, lastBackupCount }` | < 1 KB | Schema version + backup accounting |
| `tc:settings` | `{ …typed settings… }` | < 1 KB | User preferences |
| `tc:index` | `IndexEntry[]` | ~80 B × collections | Everything the library list needs to render |
| `tc:c:<id>` | `Collection` | ~100 B × tabs | One collection's full contents |
| `tc:snap:<ts>` | `Snapshot` | varies | A restore point |
| `tc:trash:<id>` | `{ collection, deletedAt }` | ~100 B × tabs | Undo-bin tombstone |

### 4.2 Records

```js
// tc:index entry — small on purpose. The list view never reads a collection record.
IndexEntry = {
  id:        "k7f3q2",   // 6-char base36, collision-checked at creation
  title:     "Tax research",
  count:     18,         // tabs
  groups:    2,          // distinct tab groups
  createdAt: 1755600000000,
  updatedAt: 1755600000000,
  rev:       3,          // monotonic; the conflict-resolution seam for Pro sync
  pinned:    false,
  locked:    false,      // locked collections refuse delete + destructive restore
  tags:      ["work"],
  windows:   1
};

Collection = {
  ...IndexEntry,
  tabs: [{
    url:      "https://example.com/a",
    title:    "Example",
    pinned:   false,
    groupId:  0,          // index into groups[], or -1
    windowIx: 0,          // index into windows, preserves multi-window layout
    savedAt:  1755600000000
  }],
  groups: [{ title: "Design", color: "blue", collapsed: false }]
};
```

**Design notes**

- `groupId` is an *index into the collection's own `groups` array*, not a Chrome group id. Chrome group ids are per-session and meaningless after a restart; storing them would be a latent bug.
- `windowIx` preserves multi-window structure so a 3-window capture restores into 3 windows.
- `rev` exists in v1 with no consumer. It is the field a delta sync needs, and adding it later would mean a migration across every user's library.

### 4.3 Write protocol

Every mutation follows the same sequence, implemented once in `db.js`:

```
1. Validate the payload (shape, size, URL scheme)
2. If destructive → snapshots.capture(reason)
3. Write the collection record        (chrome.storage.local.set)
4. Patch the index entry              (read-modify-write on tc:index only)
5. Notify open surfaces               (storage.onChanged fires automatically)
6. Return an inverse operation        (for the undo toast)
```

Steps 3 and 4 are two writes rather than one atomic transaction, because `chrome.storage` has no transactions. The ordering is chosen so that the failure modes are benign:

- Record written, index patch fails → an **orphan record**. Invisible, harmless, and reclaimed by `db.reconcile()` on next startup.
- Index patched, record write fails → a **dangling entry**. `db.reconcile()` detects the missing record and either restores it from the newest snapshot or removes the entry with a user-visible notice.

`db.reconcile()` runs on every service-worker startup and on library load, and is cheap: one index read plus a `chrome.storage.local.get(null)` key sweep.

### 4.4 Quota

| Limit | Value | Handling |
|---|---|---|
| `storage.local` default | 10 MB | Lifted by `unlimitedStorage` |
| Practical ceiling | Disk | Meter warns at 75%, blocks-with-guidance at 95% |
| Per-tab record | ~100 B | 10,000 tabs ≈ 1 MB |

The storage meter is computed from `chrome.storage.local.getBytesInUse()` and shown permanently in the library rail. Telling users the truth about their storage is cheaper than handling the support ticket when it runs out.

### 4.5 Migrations

```js
const migrations = {
  1: async () => { /* v1.0.0 — establish tc:meta, tc:settings, tc:index */ },
  // 2: async () => { … } — future schema changes append here, never edit in place
};
```

`db.init()` reads `tc:meta.schema`, runs every pending migration in order inside a snapshot-protected block, and writes the new schema version last. If a migration throws, the schema version is not advanced and the pre-migration restore point is intact — so a bad migration is recoverable rather than terminal. This is the exact failure the reference product suffered in December 2025.

---

## 5. Capture and restore

### 5.1 Capture (`lib/capture.js`)

```
chrome.tabs.query(scope)
  → filter: excluded schemes (chrome://, edge://, about:, devtools://,
             chrome-extension://, view-source:, file:// if the user opts out),
             the extension's own pages, and pinned tabs when
             settings.keepPinnedOpen is on
  → chrome.tabGroups.query({windowId}) for group metadata
  → normalise into { tabs[], groups[], windows }
  → db.createCollection()
  → chrome.tabs.remove(capturedIds) if settings.closeAfterStow
```

Notes:

- Group metadata is fetched **once per window**, not once per tab.
- Tabs are captured before they are closed, and the close is only issued after the storage write resolves. A failed write can therefore never cost the user their tabs — the exact opposite of the incumbent's failure mode.
- Discarded/unloaded tabs still carry `url` and `title`, so a "sleeping" tab captures correctly.

### 5.2 Restore (`lib/restore.js`)

```
plan = group tabs by windowIx (or force one window per settings)
for each window:
  chrome.windows.create({url: firstUrl}) or reuse the current window
  for each batch of N (default 8):
     chrome.tabs.create({url, pinned, active:false, index})
     await a microtask yield          ← keeps Chrome responsive, allows cancel
  for each group:
     chrome.tabs.group({tabIds})
     chrome.tabGroups.update(groupId, {title, color, collapsed})
report: { opened, skipped, reason[] }
```

- **Batching** is what makes restoring 200 tabs survivable. Creating 200 tabs synchronously stalls the browser.
- **Unrestorable URLs** (`chrome://`, Web Store pages) are skipped with an explicit, copyable report rather than a silent failure.
- Restore is **non-destructive by default**; the collection is untouched unless `settings.consumeOnRestore` is enabled.

---

## 6. Search (`lib/search.js`)

No external library. A ranked scan with early exit.

| Property | Implementation |
|---|---|
| Corpus | Built lazily on first search from the index plus loaded collections; cached and invalidated by `storage.onChanged` |
| Matching | Case- and diacritic-insensitive substring, plus token-prefix matching (`tax res` matches "Tax residence") |
| Ranking | title-start 100 · title-word-start 70 · title-substring 45 · hostname 40 · URL 20 · collection-name 30; recency adds up to 15 |
| Debounce | 90 ms |
| Budget | Results are capped at 300 and the scan yields every 2,000 records so typing never blocks the frame |
| Measured | ~35 ms over 20,000 tabs on a mid-range laptop (see [`testing-report.md`](testing-report.md)) |

Fuzzy/edit-distance matching was evaluated and rejected: at 20,000 records it is 8–10× slower and produces confusing results for URL-shaped data. Token-prefix matching gives most of the benefit at a fraction of the cost.

---

## 7. Rendering and performance

### 7.1 Virtualised list (`lib/virtual-list.js`)

A windowed renderer: given a total row count and a fixed row height, it mounts only the visible rows plus an overscan of 8, positions the viewport with a single spacer element, and recycles nodes on scroll.

- DOM nodes stay at ~40 regardless of library size.
- Scroll handling is `passive` and rAF-throttled.
- `aria-setsize` / `aria-posinset` are set per row so assistive technology reports true positions.

### 7.2 Performance budget

| Metric | Budget | Measured |
|---|---|---|
| Popup first paint | < 80 ms | ~38 ms |
| Library first paint (1,000 collections) | < 250 ms | ~140 ms |
| Search keystroke → results (20,000 tabs) | < 150 ms | ~35 ms |
| Stow 50 tabs | < 300 ms | ~120 ms |
| Scroll frame | ≤ 16 ms | ~6 ms |
| Unpacked size | < 250 KB | ~118 KB |
| Idle memory | < 12 MB | ~7 MB |

### 7.3 How the budget is held

- No framework, no virtual DOM.
- Data rows are built with `document.createElement` and `textContent`. `innerHTML` is never used with data — this is both a performance rule and the XSS defence.
- CSS uses custom properties and `content-visibility: auto` on collapsed collections.
- Favicons come from Chrome's local cache via `_favicon/` (no network, no layout thrash) with `loading="lazy"`.
- The service worker holds no state and does no work at rest.

---

## 8. Security

| Threat | Mitigation |
|---|---|
| XSS from a hostile page title or URL | All data reaches the DOM through `textContent` or `setAttribute`. `innerHTML` is used only for static, developer-authored markup. `tools/validate.py` greps for `innerHTML` assignments in loops. |
| `javascript:` / `data:` URLs in a saved list or an import | Restore and link rendering allow only `http`, `https`, `ftp`, and `file` schemes. Everything else is skipped and reported. |
| Remote code execution | CSP `script-src 'self'`; no `eval`, no `new Function`, no inline handlers, no remote scripts. MV3 forbids remote code and the build verifies it. |
| Supply-chain compromise | Zero runtime dependencies. Nothing to compromise. |
| Prototype pollution via import | `JSON.parse` output is validated field-by-field against a schema; `__proto__`, `constructor`, and `prototype` keys are stripped. |
| Data exfiltration | No network API is present in the source. The build fails if one appears. |
| Malicious fork trading on the brand | MIT source with an explicit brand-asset carve-out (see [`branding.md`](branding.md)). |

---

## 9. Error handling

| Layer | Strategy |
|---|---|
| Storage writes | Wrapped in `safeSet()`, which catches `QUOTA_BYTES` and surfaces the quota error state with recovery actions |
| Chrome API calls | Every call checks `chrome.runtime.lastError`; failures degrade to a user-visible message, never a silent no-op |
| Corrupt records | `db.reconcile()` isolates the bad record, keeps the rest of the library working, and offers a restore point |
| Unhandled rejections | A global handler on each page logs to the console and shows a non-blocking "something went wrong" row with a copyable trace. Nothing is sent anywhere. |
| Service-worker death mid-operation | All state lives in storage; there is no in-memory state to lose. Operations are idempotent and re-runnable. |

---

## 10. Testability

`tools/test.mjs` runs the pure modules under Node with a lightweight `chrome.storage` mock:

| Module | Covered |
|---|---|
| `db.js` | create / read / update / delete, index consistency, reconcile, migrations |
| `snapshots.js` | rolling cap, capture, restore, ordering |
| `trash.js` | tombstone, restore, TTL sweep |
| `search.js` | ranking order, diacritics, token prefixes, result cap |
| `exporter.js` | all five formats, escaping (HTML, CSV injection, Markdown) |
| `importer.js` | Tabcove JSON, OneTab text, plain URLs, malformed input, prototype-pollution attempts |
| `format.js` | relative time, hostnames, byte sizes, pluralisation |
| `capture/restore` | plan-building logic, exercised as pure functions against fixtures |

DOM-bearing modules are exercised manually against the matrix in [`testing-report.md`](testing-report.md).

---

## 11. Extension points already in place for Pro

| Pro capability | Seam that already exists in v1.0.0 |
|---|---|
| Cloud sync | Sharded records + `rev` counters + `updatedAt` = a delta sync is a diff of `tc:index` |
| Licence gating | `flags.can()` is the only reader of tier; `license.js` is a complete interface with a free-tier stub body |
| Unlimited restore points | `LIMITS[tier].snapshots` is already read from a tier table |
| AI grouping | `Collection.groups[]` is already a first-class array; an AI grouper writes into the same shape the UI already renders |
| Additional permissions | Will be added as `optional_permissions` and requested at activation, so a free user's granted permission set never changes |
| Encryption | Collections are plain serialisable objects with no handles or DOM references |
