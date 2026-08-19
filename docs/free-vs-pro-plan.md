# Free vs Pro Plan — Tabcove

**Version:** 1.0
**Date:** 19 August 2026
**Principle:** Free is a complete product. Pro is a different product for a different person. Nothing crosses the line backwards.

---

## 1. The commitment

> **Every feature shipped free in v1.0.0 stays free forever.**

This sentence appears in `README.md`, on the options page, and in the store listing. It exists because the two clearest cautionary tales in this exact category are products that broke it:

- **Toby** moved to a subscription and its recent reviews turned on it.
- **Session Buddy** shifted toward accounts and cloud and its last-500-review average fell to roughly 3.06 against a 4.66 lifetime rating.

The installed base of a free utility is an asset that can be spent exactly once. Tabcove will not spend it.

---

## 2. Segmentation logic

The Free/Pro line is not drawn by *how much* you use Tabcove. It is drawn by **where your data lives and who does the thinking**:

| | Free | Pro |
|---|---|---|
| **Where data lives** | This device only | This device **plus** an encrypted cloud copy |
| **Who does the work** | You decide what to save and when | Tabcove decides, on rules or with AI |
| **What it costs us** | Nothing per user | Storage, bandwidth, inference — real marginal cost |

That last row is the honest justification. Free features have zero marginal cost, so charging for them is rent-seeking. Pro features have real recurring cost, so charging for them is trade.

**A corollary that shapes the whole design:** no limit is ever placed on how many collections, tabs, or exports a free user has. Capped-count freemium ("3 free workspaces") is the most-complained-about pattern in this category. Tabcove's free tier is unlimited.

---

## 3. Free tier — v1.0.0 (shipping now)

| # | Feature | Detail |
|---|---|---|
| 1 | **Stow all tabs** | Every tab in the current window, one click or `Alt+Shift+S` |
| 2 | **Stow this tab / other tabs / selected tabs** | Granular capture from popup or right-click menu |
| 3 | **Stow all windows** | Multi-window capture in one action |
| 4 | **Unlimited collections and tabs** | No count caps, ever |
| 5 | **Library** | Full-page, virtualised, sortable manager |
| 6 | **Instant ranked search** | Titles, URLs, hostnames, collection names |
| 7 | **Tab groups preserved** | Chrome group name + colour survive the round trip |
| 8 | **Pinned state preserved** | Pinned tabs come back pinned |
| 9 | **Window layout preserved** | Multi-window collections restore into multiple windows |
| 10 | **Non-destructive restore** | Opening never consumes the collection (togglable) |
| 11 | **Restore points** | 10 rolling automatic snapshots, restorable from the UI |
| 12 | **Undo bin** | 30-day recovery for deleted collections |
| 13 | **Undo toast** | Every destructive action is reversible for 10 seconds |
| 14 | **Export** | JSON, HTML, Markdown, CSV, plain text |
| 15 | **Import** | Tabcove JSON, OneTab text, plain URL lists |
| 16 | **Backup reminder** | Dismissible nudge when the library outgrows the last export |
| 17 | **Duplicate finder** | Detect and merge duplicates across the library |
| 18 | **Command palette** | `Ctrl/⌘ + K` |
| 19 | **Keyboard shortcuts** | Configurable via `chrome://extensions/shortcuts` |
| 20 | **Rename, pin, tag, reorder, lock collections** | Full organisation |
| 21 | **Locked collections** | A lock flag that blocks delete and destructive restore |
| 22 | **Dark / light / system theme** | Real theming, not a filter |
| 23 | **Full keyboard operation + WCAG 2.1 AA** | Every action reachable without a mouse |
| 24 | **Storage health meter** | Live quota use with plain-language guidance |
| 25 | **Zero network access** | No host permissions, no remote code, no telemetry |

---

## 4. Pro tier — v2.0.0 (planned, not built)

Nothing below exists in v1.0.0, and nothing below is advertised in the v1.0.0 UI beyond a single honest line on the options page.

| # | Pro feature | Why it is Pro |
|---|---|---|
| 1 | **Encrypted cloud sync** | Real server + bandwidth cost. End-to-end encrypted; the key never leaves the device. |
| 2 | **Cross-browser sync** | Chrome ↔ Edge ↔ Brave ↔ Firefox. Requires the sync backend. |
| 3 | **Unlimited restore points + history timeline** | Retention beyond 10 snapshots needs storage headroom. |
| 4 | **Scheduled auto-archive rules** | "Stow anything untouched for 7 days." Automation, not capability. |
| 5 | **AI auto-grouping and titling** | Inference cost per call. Names a collection and clusters its tabs by topic. |
| 6 | **AI semantic search** | "That article about tax residency" without the exact words. Embedding cost. |
| 7 | **Tab insights** | Your own habits, computed locally: reopen rates, dead-link detection, which collections you never return to. Named `tabInsights` in `lib/flags.js` rather than `analytics`, because it is statistics about the user's own tabs and not telemetry about the user. |
| 8 | **Dead-link checker** | Requires network requests — deliberately outside Free's zero-network guarantee. |
| 9 | **Shared collections** | Read-only public links. Hosting cost. |
| 10 | **Advanced export targets** | Notion, Obsidian, Raindrop, Readwise. Integration maintenance. |
| 11 | **Custom themes and density presets** | Cosmetic; a fair, guilt-free paid extra. |
| 12 | **Priority support** | Human time. |

### Pricing intent

| Plan | Price | Note |
|---|---|---|
| Free | $0 | Permanent, unlimited, no account |
| Pro monthly | $2.49 | |
| Pro yearly | $19.00 | ~36% saving |
| Pro lifetime | $39.00 | **Offered permanently.** The subscription-averse are exactly this product's core audience. |

---

## 5. Technical seam — how Pro arrives without a rewrite

Three files carry the entire licensing surface. Everything else in the codebase is Pro-agnostic.

### 5.1 `lib/flags.js` — the single source of truth

```js
// Every gated capability is a named flag with an explicit tier.
export const FLAGS = {
  cloudSync:       { tier: 'pro',  since: '2.0.0' },
  unlimitedSnaps:  { tier: 'pro',  since: '2.0.0' },
  autoArchive:     { tier: 'pro',  since: '2.0.0' },
  aiGrouping:      { tier: 'pro',  since: '2.0.0' },
  tabInsights:     { tier: 'pro',  since: '2.0.0' },
  // ...every free capability is declared too, so the gate is exhaustive
  restorePoints:   { tier: 'free', since: '1.0.0' },
};

export async function can(flag) { /* tier check against the licence */ }
```

Call sites read `await can('cloudSync')` and never `if (isPro)`. Adding a Pro feature means adding one flag entry and one call site — never touching storage, UI plumbing, or the service worker.

### 5.2 `lib/license.js` — the verification seam

In v1.0.0 this module is a **complete, working stub** that always resolves to the free tier. Its interface is already the shape the real implementation needs:

```js
export async function getLicense()            // -> { tier, status, expiresAt, source }
export async function activate(key)           // -> { ok, license } | { ok:false, reason }
export async function deactivate()
export function onLicenseChange(listener)
```

When Pro ships, only the body of `activate()` and a signature check change. Everything downstream already handles a `pro` tier correctly because `can()` is the only reader.

### 5.3 `lib/constants.js` — tier-aware limits

Limits are declared per tier, not hard-coded:

```js
export const LIMITS = {
  free: { snapshots: 10, trashDays: 30, collections: Infinity, tabs: Infinity },
  pro:  { snapshots: Infinity, trashDays: 365, collections: Infinity, tabs: Infinity },
};
```

Note that `collections` and `tabs` are `Infinity` in **both** tiers. Free is not a crippled Pro.

### 5.4 What Pro will require that v1 already anticipates

| Pro requirement | Already in place in v1.0.0 |
|---|---|
| Per-record sync | Storage is sharded one key per collection, so a delta sync is a diff of the index |
| Conflict resolution | Every collection carries `updatedAt` and a monotonic `rev` counter |
| Schema evolution | `db.js` has a versioned migration runner; v1 ships `migrations[1]` and the loop |
| Additional permissions | Cloud sync will need `identity` and a host permission. Both will be **optional permissions** requested at activation, so free users' permission set never changes |
| Encryption | Collections are already plain serialisable objects with no DOM or handle references |

**Crucially:** shipping Pro will not change the permissions a free user has granted. That is a hard constraint, and it is why the v1 manifest has no `optional_permissions` for network — they get added in v2 and requested at runtime, only from users who activate Pro.

---

## 6. What Free will never do

Written down so future-us cannot quietly drift:

1. Never show a locked feature in the UI with an upgrade prompt attached.
2. Never cap collections, tabs, exports, imports, or searches.
3. Never require an account, an e-mail address, or a sign-in for any free feature.
4. Never add analytics, telemetry, or a "share anonymous usage data" toggle to the free tier.
5. Never insert an ad, a sponsored link, or an affiliate link.
6. Never move a v1 free feature to Pro.
7. Never degrade free performance to make Pro look faster.

---

## 7. Gate to Phase 2

Pro development does not start until **all four** are true:

| Gate | Threshold |
|---|---|
| Users | ≥ 5,000 weekly active |
| Rating | ≥ 4.5 stars |
| Reviews | ≥ 100 |
| Week-4 retention | ≥ 35% |

Rationale: Pro is only worth building for a base that has already demonstrated it values the free product. Building it earlier spends engineering attention on revenue instead of on the thing that produces revenue.
