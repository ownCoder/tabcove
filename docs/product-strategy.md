# Product Strategy — Tabcove

**Version:** 1.0
**Date:** 19 August 2026
**Inputs:** [`market-research.md`](market-research.md)
**Outputs:** [`free-vs-pro-plan.md`](free-vs-pro-plan.md), [`growth-plan.md`](growth-plan.md), [`roadmap.md`](roadmap.md)

---

## 1. The core problem

A knowledge worker's browser is their working memory. Chrome gives them a tab strip that becomes unusable at about fifteen tabs and offers no way to put work down and pick it back up. So they do one of three things:

1. **Hoard.** Keep 80 tabs open forever. The machine suffers; nothing is ever found again.
2. **Bookmark.** Dump into a folder tree that is slow to file into and impossible to browse.
3. **Close and lose.** Declare tab bankruptcy every few weeks and accept the loss.

Tab managers exist to solve this, and the market leader solves the *first* half — collapse the tabs — while creating a new and worse problem: **the archive itself is not safe.** Users move years of research into a tool that stores it in a single local blob with no versioning and no backup, and periodically the blob goes away.

> The problem Tabcove solves is not "too many tabs."
> It is **"I put my tabs somewhere and now I need them back."**

---

## 2. The solution

Tabcove is a local-first tab archive built like a database rather than a scratchpad:

| Design decision | User-visible consequence |
|---|---|
| One storage record per collection, plus a small index | Fast at 20,000 saved tabs; a corrupt record loses one collection, not the library |
| Every destructive action writes a restore point first | "Undo" exists for things that normally have no undo |
| Deletions go to a 30-day bin | No single click is final |
| Restore does not consume the collection | The library is a library, not a queue |
| One-click export in five formats | Your data is portable *before* you need it to be |
| No network code path in the extension at all | Nothing to breach, nothing to leak, nothing to review |

---

## 3. Target audience

### 3.1 Primary segment — the Research Hoarder (≈50% of target users)

Students, academics, analysts, writers, lawyers, and developers who open 30–100 tabs per work session across several concurrent threads of work. They already use OneTab or bookmarks and are unhappy. They have measurably high lifetime value: they save the most, they search the most, and they are the segment that eventually pays for sync.

### 3.2 Secondary segment — the Overloaded Generalist (≈35%)

Marketers, PMs, founders, consultants, and support staff on 8 GB laptops. They want the machine to stop wheezing. They arrive through "how to fix Chrome using too much memory" content.

### 3.3 Tertiary segment — the Privacy-Conscious Refuser (≈15%)

Users who deliberately avoid extensions that require accounts or request broad permissions. Small, but disproportionately vocal — this segment writes the Reddit comments and the reviews that convert everyone else.

---

## 4. User personas

### Persona 1 — Maya, 27, PhD candidate

- **Setup:** MacBook Air, 60–120 tabs, three simultaneous literature reviews.
- **Today:** OneTab, ~4,000 saved links accumulated over two years. Cannot find anything in it. It has started to lag.
- **Fear:** "If that list disappears, I lose two years of reading."
- **Trigger to switch:** she reads a thread about someone losing their OneTab list.
- **What wins her:** import from OneTab in one paste, then search that actually finds the paper she half-remembers.
- **Success metric:** she searches within the first 24 hours.

### Persona 2 — Dan, 41, senior engineer

- **Setup:** Windows, 6 Chrome windows, heavy user of native tab groups with colours.
- **Today:** every session manager he has tried flattens his groups into a list.
- **Fear:** losing the *structure*, not just the URLs.
- **Trigger to switch:** he searches "save chrome tab groups extension".
- **What wins him:** groups round-trip perfectly — name, colour, order — plus keyboard shortcuts and a command palette.
- **Success metric:** he restores a grouped collection in week one and the colours are right.

### Persona 3 — Priya, 34, freelance marketing consultant

- **Setup:** 8 GB laptop, five clients, permanent tab guilt.
- **Today:** hundreds of tabs; Chrome is slow; she is scared to close anything.
- **Fear:** closing a tab she needed for a client.
- **Trigger to switch:** "chrome using too much memory" content.
- **What wins her:** one click empties the strip; the machine speeds up; and the undo bin means the fear goes away.
- **Success metric:** she stows on three separate days in week one.

### Persona 4 — Tomás, 30, security engineer

- **Setup:** hardened profile, reads every permission dialogue, will not install anything with `<all_urls>`.
- **Today:** manages tabs manually because he does not trust the category — and knows what happened to The Great Suspender.
- **Fear:** an extension update turning malicious.
- **What wins him:** four permissions, no host permissions, no remote code, open source, and a permission-justification table he can read in two minutes.
- **Success metric:** he recommends it in a thread.

---

## 5. Value proposition

**For** people who save their tabs and then need them back,
**Tabcove** is a local-first tab manager
**that** keeps every saved tab searchable, exportable, and recoverable,
**unlike** OneTab and other tab savers, which store everything in one fragile local blob with no search, no versioning, and no undo,
**because** Tabcove is built on sharded storage with automatic restore points and a 30-day undo bin — and never sends a single byte anywhere.

### The one-sentence version

> **Save all your tabs in one click — and actually get them back.**

---

## 6. Unique selling proposition

**Tabcove is the only tab manager that treats your saved tabs as data worth protecting.**

Three proof points, in the order a sceptic will test them:

1. **Restore points.** Ten automatic snapshots. Time-travel from the Library. No competitor in the free tier offers this.
2. **Zero host permissions.** No content scripts. No `<all_urls>`. No `fetch`, no `XMLHttpRequest`, no `WebSocket` anywhere in the source. Verifiable in one grep, and we tell users the grep.
3. **Speed at scale.** 20,000 saved tabs stays under a 150 ms search and a 16 ms scroll frame, because the library is virtualised and the store is sharded.

---

## 7. Growth strategy

Detail lives in [`growth-plan.md`](growth-plan.md). Strategic shape:

| Channel | Why it fits Tabcove |
|---|---|
| **Chrome Web Store SEO** | The category's search terms are high-volume and evergreen. The store is the funnel; everything else feeds it. |
| **Rescue content** | "OneTab lost my tabs" already has search demand and no good answer. We are the answer, and we can say so honestly because we also *import* from OneTab. |
| **Reddit (r/chrome, r/productivity, r/GetStudying, r/PhD, r/webdev)** | The privacy + no-account angle plays extremely well here. Requires participation, not posting. |
| **Product Hunt** | One well-run launch is worth roughly 300–800 installs and, more importantly, permanent backlinks and review credibility. |
| **Short-form video (YouTube Shorts / TikTok)** | "Close 100 tabs in one click" is a genuinely satisfying 12-second visual. The highest ceiling and the lowest cost channel available. |
| **Open source on GitHub** | The security segment's price of entry, and a permanent source of trust signals. |

**Sequencing principle:** ship, get the listing right, seed the first 25 honest reviews, *then* spend attention on launches. A Product Hunt launch pointing at a listing with four reviews wastes the launch.

---

## 8. Retention strategy

Retention in a utility extension is won in three moments.

### Moment 1 — first 60 seconds

The welcome page does one thing: it gets the user to stow their first collection and see it appear. No tour, no signup, no permission ambush. **Target: 70% of installs stow within 5 minutes.**

### Moment 2 — first retrieval

The product's whole promise is retrieval. If the first search fails, the user never returns. Search is therefore ranked, forgiving, and instant, and the Library's empty state teaches it explicitly. **Target: 45% of installs perform a search in week one.**

### Moment 3 — the near-loss

Every user eventually deletes something by accident. This is the single highest-leverage moment in the product: an undo toast that works, and a bin they can find, converts a would-be uninstall into a permanent advocate. **Target: 100% of accidental deletions recoverable.**

### Structural retention

- **Backup reminder.** A dismissible nudge after the library grows materially past the last export. This is retention *and* the honest thing to do.
- **Keyboard shortcuts.** `Alt+Shift+S` to stow, `Alt+Shift+L` to open the library. Muscle memory is stickiness.
- **The archive itself.** Every stow raises the switching cost — but because export is one click and unrestricted, that cost is earned, not imposed.

---

## 9. Monetisation roadmap

Full detail in [`free-vs-pro-plan.md`](free-vs-pro-plan.md).

| Phase | Trigger | Move |
|---|---|---|
| **Phase 1 — Free** | Launch → 5,000 users | Everything above ships free. No upsell UI, no locked buttons, no nag. The only mention of Pro is one line on the options page: *"Tabcove is free. Pro features are planned; nothing here will ever move behind a paywall."* |
| **Phase 2 — Pro (v2.0)** | 5,000+ users, rating ≥ 4.5, ≥ 100 reviews | Introduce Pro as **additive**: encrypted cloud sync, unlimited restore points, scheduled auto-archive rules, AI grouping and tagging, analytics, cross-browser. |
| **Pricing intent** | — | $2.49/mo, $19/yr, or a $39 lifetime licence. Lifetime is offered permanently — the segment that hates subscriptions is exactly the segment that trusts this product. |
| **Hard commitment** | — | **No feature that ships free in v1 ever becomes paid.** This is written into `README.md`, the store listing, and the licence header. Breaking it is how Toby and Session Buddy lost their rating. |

---

## 10. The 5,000-user roadmap

| Stage | Users | Duration | Primary lever | Leading indicator |
|---|---|---|---|---|
| **0 — Launch** | 0 → 50 | Week 1 | Store approval, listing quality, personal network | Listing live, 5 reviews |
| **1 — Signal** | 50 → 300 | Weeks 2–4 | Store SEO indexing, first Reddit participation, GitHub repo | Rating ≥ 4.6, first organic install day |
| **2 — Proof** | 300 → 1,200 | Weeks 5–10 | Product Hunt launch, rescue content ranking, 3 Shorts | 50+ reviews, install/impression ≥ 8% |
| **3 — Compounding** | 1,200 → 3,000 | Weeks 11–20 | Store search ranking for "tab manager"/"session saver", round-up inclusion | Top 20 for 2 head keywords |
| **4 — Escape velocity** | 3,000 → 5,000+ | Weeks 21–32 | Word of mouth, review flywheel, v1.2 feature press | Organic ≥ 70% of installs |

**Gate to Phase 2 (Pro):** 5,000 users **and** ≥ 4.5 rating **and** ≥ 100 reviews **and** ≥ 35% week-4 retention. Monetising before all four are true buys revenue with the thing that produces revenue.
