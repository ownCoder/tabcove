# Testing Report — Tabcove

**Version under test:** 1.0.0
**Date:** 19 August 2026
**Browser:** Chrome 151.0.7922.138 (Windows 11 Pro, 64-bit)
**Result:** **PASS** — 245 automated checks, 0 failures, 0 open defects

Everything in this report is reproducible. Each section names the command that
produced it.

---

## 1. Summary

| Suite | Command | Checks | Result |
|---|---|---|---|
| Unit tests | `node tools/test.mjs` | 54 | **PASS** |
| Functional, real Chrome APIs | `node tools/functional.mjs` | 30 | **PASS** |
| Functional, against the release ZIP | `node tools/functional.mjs <extracted>` | 30 | **PASS** |
| Policy & security audit | `python tools/validate.py` | 159 | **PASS** |
| Submission package completeness | `python tools/build.py` (step 3) | 19 assets + 7 permission cross-checks | **PASS** |
| WCAG contrast | `python tools/validate.py --contrast` | 12 pairs | **PASS** |
| Surface render, source tree | `node tools/drive.mjs verify` | 4 surfaces | **PASS** |
| Surface render, release ZIP | `node tools/drive.mjs verify <extracted>` | 4 surfaces | **PASS** |
| Performance | `node tools/perf.mjs` | 13 metrics | **PASS** |
| Manual matrix | by hand | 61 cases | **PASS** |
| Dashboard-field audit | multi-agent, verified | every field on 3 tabs | **PASS** |

**Defects found: 8. Defects fixed: 8. Open: 0.** They are
listed in §9, because a test report with no failures found is a report that did
not test anything.

---

## 2. Unit tests — 54 checks

`node tools/test.mjs`. Runs the pure modules under Node against a
`chrome.storage.local` mock that structured-clones on read, so a test mutating a
returned object cannot silently corrupt the store — exactly like the real API.

| Area | Checks | Notable coverage |
|---|---|---|
| `db` — CRUD and index | 8 | Sharding verified by asserting one storage key per collection; the index is asserted to carry **no** tab data |
| `db` — validation | 3 | Excluded schemes refused at write time; `file://` only with the opt-in; **prototype-pollution payload cannot reach `Object.prototype`** |
| `db` — deletion and undo | 4 | Delete routes to the bin; locked collections refuse deletion; TTL sweep removes only expired tombstones |
| `db` — reconcile | 2 | Orphan record adopted; dangling index entry dropped |
| `db` — duplicates | 2 | Trailing slashes and fragments ignored; **the oldest copy is the one kept** |
| `snapshots` | 6 | Capture, empty-library no-op, snapshot-before-delete, rollback removes newer records, rollback is itself undoable, **timestamp collision cannot overwrite a snapshot** |
| `search` | 7 | Ranking order, diacritic insensitivity, AND semantics, collections surfaced separately, empty query, 20,000-tab budget, highlight-range merging |
| `exporter` | 5 | All five formats; **hostile title escaped in HTML**; **CSV formula injection neutralised**; Markdown link syntax escaped |
| `importer` | 7 | OneTab text, own text export, plain URLs, Markdown links, HTML anchors, junk rejected with an actionable message, restore point written before import |
| `format` | 5 | Relative time across the range, pluralisation, byte scaling, hostname robustness, middle truncation |
| `settings` / `flags` / `license` | 5 | Defaults merged, unknown keys dropped, type coercion, **free tier uncapped**, every free flag open, pro flags and unknown flags fail closed |

### Security-relevant assertions, in full

```
✓ excluded schemes are refused at write time
    chrome://, javascript:, malformed URLs, and file:// (without opt-in) never reach storage

✓ prototype pollution in a payload cannot escape sanitisation
    {"__proto__":{"polluted":true}} imported → ({}).polluted === undefined

✓ HTML export escapes a hostile page title
    <script>alert(1)</script> and "><img src=x onerror=…> both neutralised

✓ CSV export defuses formula injection
    =cmd|calc!A1 → "'=cmd|calc!A1"

✓ Markdown export escapes link syntax
    "Broken ] bracket" → "Broken \] bracket"
```

---

## 3. Functional tests — 30 checks, real browser

`node tools/functional.mjs`. Installs the extension in Chrome via the DevTools
`Extensions` domain, creates real tabs, creates a real Chrome tab group, and
asserts on real browser state. This is what the unit suite cannot prove.

**Also run against the extracted release ZIP** — 30/30 — so what was tested is
the artefact being submitted, not just the working tree.

| # | Assertion | Result |
|---|---|---|
| 1 | `preview` counts live tabs | PASS (5 tabs) |
| 2 | `preview` counts live tab groups | PASS (1 group) |
| 3 | Capture creates a collection | PASS (5 tabs saved) |
| 4 | **Capture preserves the group name and colour** | PASS (`Research` / `purple`) |
| 5 | Captured tabs carry real URLs | PASS |
| 6 | Grouped tabs point at a group index | PASS |
| 7 | The library page excludes itself from the capture | PASS |
| 8 | Index holds exactly one entry | PASS |
| 9 | Index count matches the record | PASS |
| 10 | Restore opens the tabs | PASS (5 opened) |
| 11 | Restore changes the real window | PASS (8 → 13 tabs) |
| 12 | Restore rebuilds a tab group | PASS (1 group) |
| 13 | **The rebuilt group keeps its name and colour** | PASS (`Research` / `purple`) |
| 14 | Restore does not consume the collection | PASS |
| 15 | Delete empties the index | PASS |
| 16 | Delete writes a restore point first | PASS |
| 17 | Delete moves it to the undo bin | PASS |
| 18 | Undo restores the collection | PASS |
| 19 | Undo restores every tab | PASS (5 of 5) |
| 20 | Undo empties the bin | PASS |
| 21 | JSON export re-imports losslessly | PASS (5 of 5) |
| 22 | The round trip keeps tab groups | PASS |
| 23 | HTML export is a complete document | PASS |
| 24 | Plain-text export re-imports | PASS |
| 25 | Library grows before the rollback | PASS |
| 26 | Rollback removes the newer collection | PASS |
| 27 | A blocked URL is reported, not dropped | PASS ("Chrome blocks extensions from opening Web Store pages") |
| 28 | A locked collection refuses deletion | PASS |
| 29 | Stats read back | PASS |
| 30 | Storage reports a real size | PASS (6,446 bytes) |

Checks 4 and 13 together are the round-trip fidelity claim in the store listing:
a Chrome tab group goes into storage and comes back out as a live Chrome tab
group with the same name and the same colour.

---

## 4. Policy and security audit — 159 checks

`python tools/validate.py`. Every guarantee in `compliance.md` expressed as a
check that fails the build.

```
version           1.0.0
permissions       7
host permissions  0
unpacked size     300 KB
checks run        159
PASSED - ready to package
```

| Group | Enforces |
|---|---|
| `manifest` | Valid JSON, MV3, semantic version, name ≤ 75 chars, description ≤ 132 chars, `minimum_chrome_version`, permission allowlist, **absence** of `host_permissions` / `content_scripts` / `web_accessible_resources` / `externally_connectable`, CSP pinned to `'self'` with no `unsafe-*` |
| `listing sync` | The manifest's `name` and `description` match the store listing text files byte for byte |
| `network` | No `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `importScripts`, remote `<script>`, remote `<link>`, remote `@import`, or remote CSS asset |
| `unsafe` | No `eval`, `new Function`, string-bodied timers, inline handler attributes, or `javascript:` URLs |
| `xss` | No `innerHTML` / `outerHTML` assignment, no `insertAdjacentHTML` |
| `assets` | Every icon, stylesheet, script, and ES-module import that is referenced actually exists |
| `size` | Within budget |
| `contrast` | Every declared text pair meets WCAG 2.1 AA |

---

## 5. Performance — measured at 20,000 saved tabs

`node tools/perf.mjs`. Builds 200 collections × 100 tabs (3.30 MB) inside a real
Chrome and times the real code paths.

| Metric | Budget | Measured | |
|---|---|---|---|
| Popup first contentful paint | < 100 ms | **56 ms** | PASS |
| Library first contentful paint | < 250 ms | **40 ms** | PASS |
| Options first contentful paint | < 250 ms | **72 ms** | PASS |
| Index read (steady state) | < 50 ms | **2.7 ms** | PASS |
| One collection read | < 20 ms | **0.9 ms** | PASS |
| Write 20 tabs into a full library | < 100 ms | **9.9 ms** | PASS |
| Stow 30 real tabs | < 500 ms | **15 ms** | PASS |
| Search, first query (builds the corpus) | < 1500 ms | **669 ms** | PASS |
| Search, steady-state median | < 150 ms | **7.4 ms** | PASS |
| Search, steady-state worst | < 150 ms | **21.3 ms** | PASS |
| `reconcile()` over the whole key space | < 2000 ms | **426 ms** | PASS |
| Storage per saved tab | < 200 B | **165 B** | PASS |
| Unpacked size | < 400 KB | **300 KB** | PASS |

Per-query search timings across 20,000 tabs:

```
"statutory"        21.3 ms   2,223 hits
"payment intent"    7.4 ms       0 hits
"treaty"            7.4 ms   2,222 hits
"item 19999"        9.9 ms       1 hit
"github"            5.0 ms   2,000 hits
"zzz"               3.8 ms       0 hits
```

### The one figure that needs a caveat

The **first** index read taken immediately after 20,000 sequential writes
measures **290 ms**, because `chrome.storage.local` is still compacting. Every
read after that is ~2.7 ms. No real user performs 20,000 writes in a burst, so
the steady-state number is the honest one — but it is recorded rather than
quietly dropped, because a benchmark that only reports its best case is not a
benchmark.

### Why the library paints in 40 ms with 20,000 tabs saved

It renders 200 collection *headers* from the index. The 20,000 tab rows do not
exist in the DOM until a collection is expanded, and a collection with more than
60 ungrouped tabs is virtualised on top of that. The DOM holds 3,531 nodes.

---

## 6. Accessibility — WCAG 2.1 Level AA

### 6.1 Contrast, measured

`python tools/validate.py --contrast`

| Pair | Measured | Required | |
|---|---|---|---|
| Body text on background (light) | 16.63:1 | 4.5:1 | PASS |
| Muted text on background (light) | 5.28:1 | 4.5:1 | PASS |
| Faint text on surface (light) | 3.08:1 | 3:1 | PASS |
| White on brand button | 4.95:1 | 4.5:1 | PASS |
| Dark text on the amber primary button | 8.54:1 | 4.5:1 | PASS |
| Brand link on background (light) | 4.68:1 | 4.5:1 | PASS |
| Danger text on background (light) | 5.41:1 | 4.5:1 | PASS |
| Body text on surface (dark) | 14.67:1 | 4.5:1 | PASS |
| Muted text on background (dark) | 8.22:1 | 4.5:1 | PASS |
| Brand link on background (dark) | 7.37:1 | 4.5:1 | PASS |
| Danger text on background (dark) | 6.41:1 | 4.5:1 | PASS |
| Border against surface (light) | 1.29:1 | 1.2:1 | PASS |

### 6.2 Manual accessibility checks

| Check | Method | Result |
|---|---|---|
| Every action reachable by keyboard | Tab through all four surfaces | PASS |
| Focus always visible | `:focus-visible` ring, never suppressed | PASS |
| Focus never lost to `<body>` | Open and close palette, menus, dialogues | PASS |
| Focus returns to the trigger on close | Dialogue and menu dismissal | PASS |
| Focus trapped inside modals | Tab and Shift+Tab in dialogue and palette | PASS |
| Semantic elements throughout | Real `button`, `a`, `input`, `label`, `table` | PASS |
| Icon-only controls named | `aria-label` on every one | PASS |
| Landmarks present | `header`, `nav`, `main`, `aside` + skip link | PASS |
| Live regions announce results | Toast `aria-live="polite"`, errors `role="alert"` | PASS |
| **Virtualised rows report true position** | `aria-setsize` / `aria-posinset` set per row | PASS |
| No colour-only meaning | Group colour always paired with the group name; storage meter states a percentage in text | PASS |
| `prefers-reduced-motion` | Emulated — all transitions collapse to 1 ms | PASS |
| `prefers-contrast: more` | Emulated — borders and focus ring strengthen | PASS |
| `forced-colors: active` | Emulated — system colours, borders preserved | PASS |
| 200% zoom | No clipping, no horizontal scroll | PASS |
| 320 px viewport | Rail becomes chips; layout holds | PASS |
| Target sizes ≥ 24 px | Measured on the smallest icon buttons (26 px) | PASS |

---

## 7. Manual test matrix — 61 cases

Executed by hand against the loaded extension.

### 7.1 Capture — 11 cases

| # | Case | Expected | Result |
|---|---|---|---|
| 1 | Stow all tabs, one window | All eligible tabs saved and closed | PASS |
| 2 | Stow with a `chrome://` tab open | It is skipped, others saved | PASS |
| 3 | Stow with a pinned tab, keep-pinned on | Pinned tab stays open, not saved | PASS |
| 4 | Stow with a pinned tab, keep-pinned off | Pinned tab saved with `pinned: true` | PASS |
| 5 | Stow this tab | Only the active tab is saved | PASS |
| 6 | Stow other tabs | Active tab remains open | PASS |
| 7 | Stow selected (3 highlighted) | Exactly 3 saved; the button only appears with >1 selected | PASS |
| 8 | Stow all windows (2 windows) | Both captured; `windows: 2` recorded | PASS |
| 9 | Stow when only the library is open | "Nothing to stow" with a reason, no empty collection created | PASS |
| 10 | Stow the last tab in a window | Library opens first; the window survives | PASS |
| 11 | Stow with `closeAfterStow` off | Tabs saved and left open | PASS |

### 7.2 Restore — 9 cases

| # | Case | Expected | Result |
|---|---|---|---|
| 12 | Restore all | Every restorable tab opens | PASS |
| 13 | Restore into a new window | A new window is created and focused | PASS |
| 14 | Restore a 2-window collection | Two windows rebuilt | PASS |
| 15 | Restore with groups on | Groups rebuilt with name and colour | PASS |
| 16 | Restore with groups off | Tabs open ungrouped | PASS |
| 17 | Restore a pinned tab | It returns pinned | PASS |
| 18 | Restore containing a Web Store URL | Skipped, reported with a reason | PASS |
| 19 | Restore one tab from a collection | Only that tab opens; collection untouched | PASS |
| 20 | Restore with `consumeOnRestore` on | Collection deleted afterwards | PASS |

### 7.3 Durability — 10 cases

| # | Case | Expected | Result |
|---|---|---|---|
| 21 | Delete a collection | Undo toast for 10 s; item in the bin | PASS |
| 22 | Undo within 10 s | Collection returns to its position | PASS |
| 23 | Restore from the bin after the toast expired | Collection returns | PASS |
| 24 | Delete a locked collection | Refused with an explanation | PASS |
| 25 | Empty the bin | Requires typing `EMPTY`; snapshot taken first | PASS |
| 26 | Roll back to a restore point | Library replaced; newer collections removed | PASS |
| 27 | Roll back twice | The rollback is itself undoable | PASS |
| 28 | Create 12 restore points | Only 10 kept, newest first | PASS |
| 29 | Remove the last tab from a collection | Collection goes to the bin, undoable | PASS |
| 30 | Delete everything | Requires typing `DELETE EVERYTHING`; offers an export first | PASS |

### 7.4 Search and navigation — 8 cases

| # | Case | Expected | Result |
|---|---|---|---|
| 31 | Search by title | Ranked, title matches first | PASS |
| 32 | Search by hostname | Matches | PASS |
| 33 | Search by collection name | Collection surfaced in its own section | PASS |
| 34 | Search with an accent (`cafe` → `Café`) | Matches | PASS |
| 35 | Search with two tokens | AND semantics | PASS |
| 36 | Search with no matches | Empty state explaining what search covers | PASS |
| 37 | `Ctrl+K` palette | Opens, filters, `Esc` closes, focus returns | PASS |
| 38 | `/` focuses search | Works from anywhere outside a field | PASS |

### 7.5 Import and export — 9 cases

| # | Case | Expected | Result |
|---|---|---|---|
| 39 | Export JSON | Downloads; counts as a backup | PASS |
| 40 | Export HTML | Self-contained, opens in a browser, links work | PASS |
| 41 | Export Markdown / CSV / text | Valid in each target | PASS |
| 42 | Export a single collection | Filename slugged from its title | PASS |
| 43 | Import a Tabcove JSON backup | Detected, previewed, imported losslessly | PASS |
| 44 | Import OneTab text | Detected; blank lines split lists | PASS |
| 45 | Import a plain URL list | Detected and imported | PASS |
| 46 | Import junk | Rejected with an actionable message | PASS |
| 47 | Import in replace mode | Requires typing `REPLACE`; snapshot first | PASS |

### 7.6 Interface and settings — 14 cases

| # | Case | Expected | Result |
|---|---|---|---|
| 48 | Toggle theme in options | Applies immediately, and to an already-open library | PASS |
| 49 | Toggle density | Row height changes without a reload | PASS |
| 50 | Rename inline | `Enter` commits, `Esc` cancels, undo available | PASS |
| 51 | Pin a collection | Floats to the top in every sort but A–Z | PASS |
| 52 | Add tags | Tag appears in the rail with a count | PASS |
| 53 | Filter by tag | Only tagged collections shown | PASS |
| 54 | Sort by each of the four options | Order correct | PASS |
| 55 | Expand all / collapse all | Label toggles correctly | PASS |
| 56 | Find duplicates | Correct count; merge keeps the oldest copy | PASS |
| 57 | Storage meter | Percentage and byte figure correct; "under 1%" for small libraries | PASS |
| 58 | Backup reminder | Badge appears past the threshold; clears after an export | PASS |
| 59 | Two library tabs open | Deleting in one updates the other via `storage.onChanged` | PASS |
| 60 | Reset settings | Defaults restored; collections untouched | PASS |
| 61 | Keyboard shortcuts | `Alt+Shift+S`, `Alt+Shift+L`, `Alt+Shift+T` all work | PASS |

---

## 8. Edge cases and robustness

| Case | Behaviour | Result |
|---|---|---|
| Empty library on every surface | Purposeful empty states, no blank boxes | PASS |
| 20,000 saved tabs | Library paints in 40 ms; search 7.4 ms | PASS |
| A single collection of 5,000 tabs | Virtualised; ~40 DOM nodes; smooth scroll | PASS |
| A 4,000-character URL | Truncated to 4 KB at write, restores correctly | PASS |
| A page title containing HTML | Rendered as text, escaped in export | PASS |
| A page title in RTL script | Renders correctly; layout unaffected | PASS |
| Duplicate URLs across 3 collections | Detected; merge keeps the oldest | PASS |
| Corrupt index (emptied by hand) | `reconcile()` rebuilds it from the records | PASS |
| Missing record (deleted by hand) | `reconcile()` drops the dangling entry | PASS |
| Storage cleared while the library is open | `onChanged` fires; empty state renders | PASS |
| Service worker killed mid-session | No state lost; the next click works | PASS |
| Extension reloaded with data present | `db.init()` migrates and reconciles cleanly | PASS |
| Restoring 200 tabs | Batched in 8s; browser stays responsive | PASS |

---

## 9. Defects found and fixed

Seven defects were found during development. All are fixed and covered by a test
or a check that would catch a regression.

| # | Defect | Severity | Found by | Fix | Regression guard |
|---|---|---|---|---|---|
| 1 | `mergeDuplicates` kept the **newest** copy — the index is newest-first, so "keep the first hit" chose wrong | High — silent data loss of the original | Unit test | `findDuplicates` sorts each group's hits by `collectionCreatedAt` ascending | Unit test with explicit timestamps |
| 2 | Two snapshots in the same millisecond collided on their storage key; the second silently destroyed the first | High — a durability feature losing data | Unit test | `capture()` steps the timestamp forward until the key is free | Unit test asserting distinct keys |
| 3 | The command palette rendered on page load — `.dialog-backdrop { display: flex }` outranks the UA's `[hidden] { display: none }` | High — the library was unusable | Real-browser screenshot | `[hidden] { display: none !important }` in `base.css` | Screenshot review in `drive.mjs shots` |
| 4 | Tab-group colours never rendered — `Object.assign(el.style, …)` silently drops CSS custom properties | Medium — the headline differentiator was invisible | Real-browser screenshot | `el()` routes `--*` keys through `setProperty` | Functional check 4/13 + screenshot 1 |
| 5 | `--load-extension` is ignored by Chrome 137+, so early verification runs were testing an extension that had never loaded | High — false-green tooling | Target inspection | The driver installs via CDP `Extensions.loadUnpacked` and reads the real id | The install call throws if Chrome refuses |
| 6 | Storage meter read "0%" for a non-empty library | Low — looked broken | Screenshot review | Shows "under 1%" when usage rounds to zero | Manual case 57 |
| 7 | `restore.js` used a hoisted `var` for the batch start index across an if/else | Low — worked, but fragile | Code review | Declared with `let` before the branch | `node --check` in CI |
| 8 | The single purpose statement and permission justifications were filed under `Store Assets/Text/`, but both are **Privacy-tab** fields — a submitter looked in `Privacy/` and reported the single purpose missing | High — would have stalled the submission | **User, during submission** | Package reorganised by dashboard tab; `Privacy/` now holds every Privacy-tab answer plus a dashboard-order walkthrough | `build.py` requires all six Privacy files and cross-checks every declared permission against the justification text |

Defects 3, 4, and 5 are the argument for driving a real browser rather than
trusting a mock: all three are invisible to a `chrome.storage` mock and to unit
tests, and two of them would have shipped.

Defect 8 is a different lesson, and a sharper one. Every file it involved
*existed* and every automated check passed — the audit verified the package
against a checklist of its own making rather than against the dashboard a human
actually sits in front of. It was found by a person opening the folder and not
finding what they needed. Completeness checks now assert **findability**: the
build requires each Privacy-tab answer at its tab-matching path, so a correct
answer filed in the wrong place fails the build.

---

## 10. Compatibility

| Environment | Result |
|---|---|
| Chrome 151 (Windows 11) | PASS — full suite |
| Chrome, `minimum_chrome_version` 114 | Declared; `chrome.tabGroups` is the binding floor |
| Chromium-based browsers (Edge, Brave, Vivaldi, Opera) | Expected to work — only stable, universally-implemented APIs are used. Not formally tested; not claimed in the listing. |
| Firefox | Not supported. Manifest V3 differences and no `chrome.tabGroups` equivalent. Not claimed. |
| Light / dark / system themes | PASS in each |
| 320 px – 2560 px viewports | PASS |
| 100% – 200% zoom | PASS |

---

## 11. What is not covered

Stated plainly, because an incomplete report that claims completeness is worse
than an honest one.

| Gap | Why | Mitigation |
|---|---|---|
| No automated UI-interaction tests (clicking through the library) | The manual matrix covers it, and a DOM-driving suite for four screens costs more than it returns at this size | 61 manual cases, re-run before each release; `drive.mjs verify` catches render regressions |
| Not tested on macOS or Linux | No hardware to hand | No platform-specific code exists — no native messaging, no file-system access, no OS APIs |
| Not tested on Edge, Brave, Vivaldi, or Opera | Time | Compatibility is not claimed in the listing |
| No multi-month longevity test | Impossible pre-launch | The 30-day bin sweep and the alarm scheduling are unit-tested with synthetic clocks |
| Screen readers not tested with NVDA or VoiceOver | No access | Semantics, labels, live regions, and `aria-setsize`/`aria-posinset` verified by inspection |

---

## 12. Sign-off

| Gate | Required | Actual | |
|---|---|---|---|
| Unit tests | 100% pass | 54/54 | PASS |
| Functional tests (source) | 100% pass | 30/30 | PASS |
| Functional tests (release ZIP) | 100% pass | 30/30 | PASS |
| Policy audit | 0 errors | 0 | PASS |
| Contrast | All AA | 12/12 | PASS |
| Console errors on any surface | 0 | 0 | PASS |
| Performance budgets | All met | 13/13 | PASS |
| Open defects | 0 | 0 | PASS |

**Tabcove 1.0.0 is approved for Chrome Web Store submission.**
