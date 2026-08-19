# UX Plan — Tabcove

**Version:** 1.0
**Date:** 19 August 2026
**Status:** Implemented in `extension/popup`, `extension/library`, `extension/options`, `extension/welcome`

---

## 1. Design principles

| # | Principle | Concrete rule it produces |
|---|---|---|
| 1 | **Nothing is ever final.** | Every destructive action produces an undo toast and a recoverable record. |
| 2 | **The library is a library.** | Restoring never consumes. Reading a book does not remove it from the shelf. |
| 3 | **One primary action per screen.** | Exactly one amber button per view. Everything else is secondary or ghost. |
| 4 | **Speed is a feature you can see.** | No spinner under 200 ms; skeletons instead of blanks; virtualised lists. |
| 5 | **Keyboard-complete.** | Every action reachable without a mouse. `Ctrl/⌘+K` opens everything. |
| 6 | **Tell the truth in the UI.** | Storage meter, backup age, and permission list are visible, not buried. |
| 7 | **Never interrupt.** | No modals except confirm-destructive. No rating prompts. One dismissible reminder, at most. |

---

## 2. Surfaces

| Surface | Size | Purpose | Opens via |
|---|---|---|---|
| **Popup** | 360 × auto (max 600) | Capture. Five actions, recent collections, done in two seconds. | Toolbar icon, `Alt+Shift+S` |
| **Library** | Full tab page | Browse, search, restore, organise, recover. | Popup link, `Alt+Shift+L`, `Ctrl/⌘+K` |
| **Options** | Full tab page | Settings, backup, import/export, storage, privacy, danger zone. | Library header, Chrome extensions page |
| **Welcome** | Full tab page | First run. One job: get the first stow done. | Automatically on install |
| **Context menu** | — | Stow this tab / other tabs / all tabs from a right-click. | Right-click on any page |

**Deliberately absent:** a side panel. It is a real capability, but adding it in v1 means a second layout to maintain and test for a use case (persistent visible list) that the popup already covers. Scheduled for v1.2 once the core is proven — see [`roadmap.md`](roadmap.md).

---

## 3. Primary user flow

```
   ┌──────────────────────────────────────────────────────────────┐
   │  INSTALL                                                     │
   │  Chrome Web Store → Add to Chrome                            │
   └───────────────────────────┬──────────────────────────────────┘
                               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  WELCOME (auto-opens once)                                   │
   │  "Your tabs are safe here."                                  │
   │  • 3 promises: recoverable · searchable · never leaves device│
   │  • ONE amber button: [ Stow my open tabs ]                   │
   │  • quiet link: "Coming from OneTab? Import your list →"      │
   └───────────────────────────┬──────────────────────────────────┘
                               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  FIRST STOW                                                  │
   │  Tabs close · collection created · Library opens on it       │
   │  Toast: "18 tabs stowed · 2 groups kept   [Undo]"            │
   └───────────────────────────┬──────────────────────────────────┘
                               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  LIBRARY (the home base, returned to forever after)          │
   │                                                              │
   │   Search ───────────────► ranked results across everything   │
   │   Collection ──┬────────► Restore all      (non-destructive) │
   │                ├────────► Restore in a new window            │
   │                ├────────► Open one tab                       │
   │                ├────────► Rename · tag · pin · lock          │
   │                ├────────► Export (JSON/HTML/MD/CSV/text)     │
   │                └────────► Delete ──► Undo bin (30 days)      │
   │                                                              │
   │   Restore points ───────► roll the whole library back        │
   └──────────────────────────────────────────────────────────────┘
```

### Time-to-value target

| Step | Target |
|---|---|
| Install → welcome visible | < 1 s |
| Welcome → first collection saved | < 15 s, 1 click |
| Library open → first search result | < 200 ms |

---

## 4. Wireframes

### 4.1 Popup — 360 px

```
┌────────────────────────────────────────────────┐
│ ◗ Tabcove                        [⚙] [⤢]      │  40px header
├────────────────────────────────────────────────┤
│                                                │
│   ┌──────────────────────────────────────────┐ │
│   │   ⬒  Stow all tabs                       │ │  ← AMBER. The one
│   │      24 tabs · 3 groups                  │ │    primary action.
│   └──────────────────────────────────────────┘ │
│                                                │
│   ┌────────────────┐  ┌─────────────────────┐  │
│   │ Stow this tab  │  │ Stow other tabs     │  │  secondary
│   └────────────────┘  └─────────────────────┘  │
│   ┌────────────────┐  ┌─────────────────────┐  │
│   │ Stow selected  │  │ Stow all windows    │  │
│   │     (3)        │  │     (2 windows)     │  │
│   └────────────────┘  └─────────────────────┘  │
│                                                │
├────────────────────────────────────────────────┤
│  RECENT                                        │  12px caps, muted
│  ┌──────────────────────────────────────────┐  │
│  │ Tax research            18 tabs   2h ago │  │
│  │ Sprint 42 review        11 tabs   1d ago │  │  hover → ↗ restore
│  │ Reading list             7 tabs   3d ago │  │
│  └──────────────────────────────────────────┘  │
├────────────────────────────────────────────────┤
│  1,284 tabs in 96 collections   Open library → │  footer, muted
└────────────────────────────────────────────────┘
```

Notes:

- Counts are live and computed before render, so the button tells you exactly what it will do. "Stow all tabs" with no count is a promise; with a count it is a contract.
- "Stow selected" only appears when more than one tab is highlighted (`chrome.tabs.query({highlighted:true})`).
- "Stow all windows" only appears with 2+ normal windows.
- Popup never scrolls past 600 px; the recent list caps at 5.

### 4.2 Library — full page

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◗ Tabcove   [ ⌕ Search 1,284 saved tabs…            ⌘K ]   [Stow all] [⚙]   │
├──────────────┬───────────────────────────────────────────────────────────────┤
│              │  96 collections · 1,284 tabs        Sort: Newest ▾   ☰ ⊞      │
│  All      96 │ ┌───────────────────────────────────────────────────────────┐ │
│  Pinned    4 │ │ ▸ Tax research                    18 tabs · 2 hours ago   │ │
│  Locked    2 │ │   📌 🔒                          [Restore all] [⋯]        │ │
│  Tagged      │ ├───────────────────────────────────────────────────────────┤ │
│   work    31 │ │ ▾ Sprint 42 review                11 tabs · yesterday     │ │
│   study   12 │ │   ┌─ ● Design  (blue, 4 tabs) ──────────────────────────┐ │ │
│   later    9 │ │   │  🔗 Figma — Checkout v3      figma.com          ↗ ✕ │ │ │
│              │ │   │  🔗 Spec: payments          notion.so          ↗ ✕ │ │ │
│  ─────────── │ │   └──────────────────────────────────────────────────── │ │
│  🕘 Restore  │ │   📌 GitHub PR #482              github.com        ↗ ✕   │ │
│     points   │ │   🔗 Sentry issue TAB-91         sentry.io         ↗ ✕   │ │
│  🗑 Undo bin │ ├───────────────────────────────────────────────────────────┤ │
│     3 items  │ │ ▸ Reading list                     7 tabs · 3 days ago   │ │
│              │ └───────────────────────────────────────────────────────────┘ │
│  ─────────── │                                                               │
│  Storage     │                                                               │
│  ▓▓▓░░░ 31%  │                                                               │
│  Backup: 6d  │                                                               │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

Notes:

- **Collections are collapsed by default** and expand in place. Rendering 96 headers is instant; rendering 1,284 rows is not, so rows are virtualised and only mount when a collection is open.
- **Tab groups render as a bordered band** with the group's real Chrome colour on the left edge and its name in the band. This is the single most visible thing OneTab does not do.
- **Row actions** appear on hover and on focus (never hover-only — that would break keyboard use).
- The left rail carries the two trust features — **restore points** and the **undo bin** — as permanent navigation, not buried in a menu. They are the product's differentiator, so they get real estate.
- The storage meter and backup age sit at the bottom of the rail, always visible, never a modal.

### 4.3 Command palette (`Ctrl/⌘ + K`)

```
┌──────────────────────────────────────────────────────┐
│  ⌕ tax                                               │
├──────────────────────────────────────────────────────┤
│  COLLECTIONS                                         │
│   Tax research                       18 tabs   ↵     │
│  TABS                                                │
│   HMRC — Statutory residence test    gov.uk          │
│   Double taxation treaties           oecd.org        │
│  ACTIONS                                             │
│   Stow all tabs                            ⌥⇧S       │
│   Export library as JSON                             │
│   Open undo bin                                      │
├──────────────────────────────────────────────────────┤
│  ↑↓ navigate   ↵ open   ⇧↵ restore all    esc close  │
└──────────────────────────────────────────────────────┘
```

### 4.4 Options — sectioned single page

```
Tabcove Settings
├─ Stowing        Close tabs after stowing · keep pinned tabs open ·
│                 ignore chrome:// pages · default collection name
├─ Restoring      Non-destructive restore (default ON) ·
│                 restore into a new window · restore tab groups ·
│                 max tabs to open at once (batch size)
├─ Appearance     Theme: System / Light / Dark · density · show favicons
├─ Backup         Last export: 6 days ago  [Export now ▾]
│                 Remind me when the library grows by [200] tabs
├─ Import         [Paste OneTab list] [Choose a .json file] [Paste URLs]
├─ Restore points 10 kept · list with timestamps and sizes · [Restore] [Delete]
├─ Storage        ▓▓▓░░░ 31% of 10 MB · 1,284 tabs · [Find duplicates]
├─ Privacy        Permission table with a plain-English reason per permission
└─ Danger zone    [Empty undo bin] [Delete everything]  ← both require typing
```

---

## 5. Interaction states

Every list-bearing surface implements all five states. Nothing renders a blank box.

### 5.1 Empty states

| Surface | Copy | Action offered |
|---|---|---|
| Library, no collections | **Nothing stowed yet.** Your saved tabs will live here — searchable, exportable, and recoverable. | `[Stow all tabs]` + `Import from OneTab` |
| Search, no matches | **No matches for "xyz".** Search looks at titles, addresses, and collection names. | `Clear search` |
| Undo bin, empty | **The bin is empty.** Deleted collections stay here for 30 days before they're removed. | — |
| Restore points, empty | **No restore points yet.** Tabcove saves one automatically before anything destructive. | — |
| Popup, nothing to stow | **Only this page is open.** Nothing to stow yet. | `Open library` |
| Tag filter, no results | **No collections tagged "work".** | `Show all` |

### 5.2 Loading states

- **Under 200 ms:** nothing. Rendering a spinner for 80 ms of work makes the product feel slower, not faster.
- **200 ms – 2 s:** a skeleton with the correct row count and geometry, so the layout does not jump when data arrives.
- **Over 2 s** (bulk restore, large import): a determinate progress row — `Restoring 41 of 120…` — with a working `[Cancel]`.
- **Bulk restore** opens tabs in batches (default 8) with a short yield between batches, so Chrome stays responsive and the user can cancel mid-flight.

### 5.3 Error states

Format is always: **what happened → why → what to do next.**

| Condition | Message | Recovery offered |
|---|---|---|
| Storage quota exceeded | **Not enough room to save.** Tabcove is using 9.8 MB of its 10 MB allowance. | `Export and clear old collections` · `Find duplicates` |
| Write failed | **That didn't save.** Chrome refused the write, so nothing was changed. | `Try again` · `Export a backup first` |
| Corrupt collection record | **One collection couldn't be read.** The rest of your library is fine. | `Recover from a restore point` · `Show details` |
| Import parse failure | **That doesn't look like a tab list.** Tabcove reads Tabcove JSON, OneTab text, and plain lists of addresses. | `See an example` |
| Restore blocked (unrestorable URL) | **3 tabs couldn't be reopened.** Chrome blocks extensions from opening `chrome://` and Web Store pages. | `Copy the addresses` |
| No tabs to stow | **Nothing to stow.** Every open tab is pinned or excluded by your settings. | `Change settings` |

Errors are inline and dismissible. Nothing about an error is a modal, because a modal you cannot read around is worse than the error.

### 5.4 Confirm states

Only three things ask for confirmation, and the two irreversible ones require typing:

| Action | Confirmation |
|---|---|
| Delete a collection | None — it goes to the bin, with a 10-second undo toast |
| Empty the undo bin | Type `EMPTY` |
| Delete everything | Type `DELETE EVERYTHING`, and an export is offered first |

### 5.5 Success states

Every success is a toast with a specific count and an undo where one exists:

- `18 tabs stowed · 2 groups kept` `[Undo]`
- `11 tabs restored` (no undo needed — nothing was lost)
- `Collection deleted` `[Undo]`
- `Restore point created before deleting`
- `Exported 1,284 tabs as JSON`

Toasts sit bottom-left, are `role="status"` / `aria-live="polite"`, last 10 seconds when they carry an undo and 4 seconds otherwise, pause on hover and on focus, and stack to a maximum of three.

---

## 6. Keyboard model

### Global (Chrome commands, user-remappable at `chrome://extensions/shortcuts`)

| Shortcut | Action |
|---|---|
| `Alt+Shift+S` | Stow all tabs in this window |
| `Alt+Shift+L` | Open the library |
| `Alt+Shift+T` | Stow just this tab |

Only three global commands are registered. Chrome allots four suggested-key slots and heavy registration collides with other extensions; three leaves headroom.

### Library

| Key | Action |
|---|---|
| `/` or `Ctrl/⌘+K` | Focus search / open the palette |
| `↑ ↓` | Move between rows |
| `→ ←` | Expand / collapse a collection |
| `Enter` | Open the focused tab |
| `Shift+Enter` | Restore the focused collection |
| `Space` | Toggle selection |
| `Delete` | Delete selection (to the bin) |
| `Ctrl/⌘+Z` | Undo the last action |
| `Ctrl/⌘+E` | Export |
| `Esc` | Clear search, close the palette, close a menu |
| `?` | Keyboard-shortcut help |

Focus is a visible 2 px `--brand-600` ring at 2 px offset, applied via `:focus-visible`, and it is never removed by CSS.

---

## 7. Accessibility

Target: **WCAG 2.1 Level AA.** Verified results in [`testing-report.md`](testing-report.md).

| Area | Implementation |
|---|---|
| **Semantics** | Real `<button>`, `<a>`, `<input>`, `<dialog>`. Collections are `role="group"` with `aria-expanded`. The library list is `role="list"`. |
| **Virtualised list a11y** | `aria-setsize` and `aria-posinset` are set on every rendered row so screen readers report "item 412 of 1,284" correctly despite only ~30 rows existing in the DOM. |
| **Landmarks** | `<header>`, `<nav>`, `<main>`, `<aside>` on every full-page surface; a skip-to-content link first in tab order. |
| **Labels** | Every icon-only control has `aria-label`; every input has a real `<label>`; every group has an accessible name. |
| **Live regions** | Toasts `aria-live="polite"`; errors `role="alert"`; search results announce the count. |
| **Contrast** | All text ≥ 4.5:1, all UI boundaries ≥ 3:1. Checked by `tools/validate.py --contrast`. |
| **Focus management** | Opening the palette moves focus into it and traps it; closing returns focus to the trigger. No focus is ever lost to `<body>`. |
| **Motion** | `prefers-reduced-motion: reduce` collapses all transitions to 1 ms and removes transforms. |
| **Contrast mode** | `prefers-contrast: more` thickens borders and strengthens the focus ring. |
| **Forced colours** | `forced-colors: active` uses system colours and keeps every border visible. |
| **Zoom** | Layout is fluid to 200% zoom and to a 320 px viewport with no horizontal scroll and no clipped controls. |
| **Target size** | Every interactive target is at least 24 × 24 px, with a minimum 32 px row height in comfortable density. |
| **No colour-only meaning** | Tab-group colour is always accompanied by the group's name; the storage meter states a percentage in text. |

---

## 8. Content density

| Mode | Row height | Use |
|---|---|---|
| Comfortable (default) | 36 px | Everyone |
| Compact | 28 px | Power users with very large libraries |

Set in Options; persisted to `chrome.storage.local` under `settings.density`; applied as a `data-density` attribute on `<html>` so it costs one CSS custom-property swap and no re-render.

---

## 9. Responsive behaviour

The library is a real responsive layout, because a lot of users run it in a narrow window next to something else.

| Width | Layout |
|---|---|
| ≥ 1100 px | Left rail (240 px) + content |
| 760–1099 px | Rail collapses to icons with tooltips |
| < 760 px | Rail becomes a top row of filter chips; header actions collapse into a `⋯` menu |
| < 380 px | Single column, search stays pinned to the top |
