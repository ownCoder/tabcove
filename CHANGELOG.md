# Changelog

All notable changes to Tabcove are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-08-19

First public release. Submitted to the Chrome Web Store.

### Added — capture

- **Stow all tabs** in the current window, in one click or with `Alt+Shift+S`.
- **Stow this tab**, **stow other tabs**, **stow selected tabs**, and **stow all
  windows**, from the popup or the right-click menu.
- Every capture button shows a live count of exactly what it will save.
- Chrome **tab groups** are captured with their names, colours, and collapsed
  state; **pinned state** and **multi-window layout** are captured too.
- Tabs are written to storage **before** any tab is closed, so a failed save can
  never cost a tab.
- Closing the last tab in a window opens the library first, so the window never
  disappears from under the user.

### Added — library

- Full-page library with collapsible collections, sorting, and tag filters.
- **Ranked instant search** across titles, addresses, hostnames, and collection
  names; diacritic-insensitive, multi-token, capped and yielding so it never
  blocks a keystroke.
- **Command palette** on `Ctrl/⌘ + K` covering search and every action.
- **Virtualised rendering** for collections above 60 tabs, with correct
  `aria-setsize` / `aria-posinset` so screen readers report real positions.
- Inline rename, tagging, pinning, and locking of collections.
- Per-tab open and remove, with undo.

### Added — durability

- **Restore points**: an automatic snapshot of the whole library before every
  delete, bulk delete, import, bin-empty, duplicate merge, and schema migration.
  Ten are kept, rolling, and rolling back is itself undoable.
- **30-day undo bin** for deleted collections, swept by a daily alarm.
- **Undo toasts** on every destructive action, lasting 10 seconds and pausing on
  hover and on focus.
- **Locked collections** that refuse deletion and destructive restore.
- **Backup reminder**: a quiet, dismissible badge when the library has grown past
  the last export.
- **Storage health meter**, permanently visible, with plain-language guidance.
- `db.reconcile()` repairs orphaned records and dangling index entries on every
  startup.

### Added — portability

- Export as **JSON, HTML, Markdown, CSV, and plain text**. The HTML export is a
  self-contained, printable page that opens anywhere with nothing installed.
- Import from **Tabcove JSON, OneTab text, and plain lists of addresses**, with
  format auto-detection, Markdown-link and HTML-anchor recognition, and a preview
  before anything is written.
- **Duplicate finder and merge**, keeping the oldest copy of each address.

### Added — interface

- Popup, library, options, and welcome surfaces, all keyboard-complete.
- Light, dark, and system themes; comfortable and compact density.
- WCAG 2.1 AA contrast throughout, verified by `tools/validate.py --contrast`.
- Support for `prefers-reduced-motion`, `prefers-contrast`, and `forced-colors`.
- Responsive down to a 320 px viewport and up to 200% zoom.
- Every list surface implements empty, loading, error, confirm, and success
  states — no blank boxes anywhere.

### Added — engineering

- Manifest V3 with a service worker that holds no state.
- Sharded storage: one record per collection plus a small index.
- Versioned, snapshot-protected schema migration runner.
- Feature-flag and licence seams (`lib/flags.js`, `lib/license.js`) so Pro can be
  added later without a rewrite. The free tier is complete and uncapped.
- Zero runtime dependencies, no build step, no minification.
- 54 unit tests (`tools/test.mjs`) and a policy self-audit (`tools/validate.py`).
- A real-browser driver (`tools/drive.mjs`) that loads the extension in Chrome,
  verifies every surface renders without console errors, and captures the store
  screenshots from the running product.

### Security

- No `host_permissions`, no content scripts, no `web_accessible_resources`.
- No `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, or `sendBeacon`
  anywhere; the build fails if one appears.
- CSP pinned to `script-src 'self'`; no `eval`, no `new Function`, no inline
  handlers, no remote code.
- All data reaches the DOM through `textContent`; `innerHTML` assignment from
  data is blocked by the validator.
- Only `http`, `https`, `ftp`, and `file` URLs are stored or restored, so
  `javascript:` and `data:` URLs cannot survive an import.
- Imported JSON is rebuilt field by field, so prototype-pollution payloads cannot
  reach a live object.
- CSV export neutralises formula injection; HTML and Markdown exports escape.

### Submission package

- `Store Upload/` is organised by the **Chrome Web Store dashboard tab** that
  asks for each field, rather than by asset type.
  - `Privacy/` carries every Privacy-tab answer: the single purpose statement,
    the seven permission justifications, the data-usage declarations and
    certifications, and the policy URL — plus
    `Privacy-Tab-Answers.md`, which walks the whole tab in dashboard order.
  - `Store Assets/` carries everything the Store listing and Distribution tabs
    ask for.
- `tools/build.py` refuses to produce a ZIP unless every one of those files
  exists, and cross-checks that each permission declared in the manifest appears
  in the justification text — because the dashboard renders one mandatory box
  per permission and a blank one is the most common cause of rejection.
- `tools/make-store-text.py` regenerates the listing copy from
  `docs/store-listing.md`, so the document and the submission cannot drift.

---

## Pre-release milestones

### [0.5.0] — Polish
Options page, welcome flow, command palette, accessibility pass, dark mode.

### [0.4.0] — Portability
Export in five formats, import in three, backup reminder, duplicate finder.

### [0.3.0] — Durability
Restore points, undo bin, undo toasts, storage meter, reconcile.

### [0.2.0] — Library
Library UI, virtualised list, ranked search, tab-group rendering.

### [0.1.0] — Foundation
Scaffold, Manifest V3, sharded storage layer, capture and restore engines.

---

## Planned

### [1.1.0] — Listen
Whatever the first 500 users actually ask for. No speculative features.

### [1.2.0] — Side panel
A persistent side-panel view of the library.

### [1.3.0] — Sessions
Optional automatic capture of a window's tabs when it closes.

### [1.4.0] — Locale
Eight languages, using the `_locales` scaffold already in place.

### [2.0.0] — Pro
Encrypted cloud sync, cross-browser sync, unlimited restore points, scheduled
auto-archive rules, AI grouping and semantic search, analytics, dead-link
checking, shared collections.

**Everything free in 1.0.0 remains free in 2.0.0.**

[1.0.0]: https://github.com/ownCoder/tabcove/releases/tag/v1.0.0
