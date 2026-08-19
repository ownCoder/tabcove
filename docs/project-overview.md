# Project Overview — Tabcove

**Version:** 1.0.0
**Date:** 19 August 2026
**Owner:** ownCoder
**Status:** Ready for Chrome Web Store submission

---

## 1. Final project name

# Tabcove

**Store title:** `Tabcove — Tab Manager & Session Saver`
**Tagline:** *A safe harbour for every tab.*
**One-liner:** Save all your open tabs in one click, find any of them in one second, and never lose them — restore points, an undo bin, and one-click backup, all 100% on your device.

The name is used verbatim and consistently in:

| Surface | Value |
|---|---|
| Project folder | `Tabcove/` |
| `manifest.json` → `name` | `Tabcove — Tab Manager & Session Saver` |
| `manifest.json` → `short_name` | `Tabcove` |
| UI header / popup / library | `Tabcove` |
| GitHub repository | `tabcove` |
| GitHub Pages site | `https://owncoder.github.io/tabcove/` |
| Store listing | `Tabcove — Tab Manager & Session Saver` |
| Release ZIP | `tabcove-v1.0.0.zip` |
| Support e-mail identity | ownCoder |

---

## 2. Why this name was selected

### 2.1 The brief

The name had to be:

1. **Original** — not present on the Chrome Web Store, and not a near-miss of anything that is.
2. **Brandable** — a real word-feel, ownable, not a keyword string like "Tab Manager Pro".
3. **Meaningful** — carrying the product's core promise rather than its category label.
4. **Findable** — containing the token `tab`, because Chrome Web Store search weights the extension name heavily and `tab` is the category's root keyword.
5. **Safe** — clear of obvious trademark collisions in software.

### 2.2 The metaphor

A **cove** is a small, sheltered bay. Boats are taken into a cove precisely *because* the open water is dangerous — it is where you put something valuable so that the storm cannot take it. That is exactly the product: the category leader's defining failure is losing user data, and Tabcove's defining feature is that it does not.

The metaphor also carries the whole UI vocabulary naturally and without strain:

| Concept | Tabcove word | Why it works |
|---|---|---|
| Saving tabs | **Stow** | What you do with cargo before a crossing |
| A saved set of tabs | **Collection** | Plain, honest, no jargon |
| The main screen | **Library** | Signals "browsable and searchable", not "queue" |
| Automatic snapshots | **Restore points** | Familiar from operating systems; instantly understood |
| Deleted items | **Undo bin** | Explicitly reversible |

### 2.3 Names considered and rejected

| Candidate | Verdict | Reason |
|---|---|---|
| TabVault | **Rejected** | Three separate live Chrome Web Store extensions already use it (`TabVault`, `TabVault Pro`, `TabGroup Vault`), plus multiple GitHub projects. Hopelessly crowded. |
| Tab Shelf / Tabshelf | **Rejected** | Live Chrome Web Store extension plus `tabshelf.com` and a Product Hunt listing. |
| TabTrove / Trove | **Rejected** | `TabTrove` already exists on the store; two more `Trove` extensions exist; `Trove` is also a well-known game title. |
| Tab Stash / TabStash | **Rejected** | Two live extensions with these exact names. |
| TabArk | **Rejected** | Homophone of **Arc**, a well-known browser. Real likelihood-of-confusion risk in the exact same product space. |
| Tabcellar | **Rejected** | Clear on availability, but a cellar means *forgotten storage* — the opposite of a product whose second-biggest feature is instant search. |
| Tabsule | **Rejected** | Clear on availability, but awkward to say and to spell aloud. |
| Tabnook | **Rejected** | `NOOK` is a live Barnes & Noble trademark in consumer electronics/software; unnecessary risk. |
| Stashboard | **Rejected** | Pre-existing open-source project of that name. |
| **Tabcove** | **Selected** | Zero Chrome Web Store results, zero software-product results, strong metaphor, contains the `tab` keyword, two syllables, unambiguous spelling. |

---

## 3. Trademark conflict summary

**Searches performed (19 August 2026):**

| Query | Result |
|---|---|
| `"Tabcove" chrome web store extension` | No matching extension. No matching product of any kind. |
| `"Tab Cove"` (spaced form) | No matching software product. |
| Chrome Web Store category sweep (tab managers, session managers) | No listing using `Tabcove` or a confusable variant. |
| Software/product name sweep | No company, SaaS, app, or open-source project named Tabcove found. |

**Assessment**

- **Chrome Web Store:** clear. No name conflict, so no risk of rejection under the Web Store's *Impersonation and Intellectual Property* policy on naming grounds.
- **Common-law / registered marks:** no evidence of a Tabcove mark in software (Nice Class 9 / 42). "Cove" alone appears in unrelated classes (a wellbeing app, hospitality, construction). A compound coined mark applied to browser software is materially distinct from these, and none of them operate in browser tooling.
- **Chrome branding rules:** the name does not contain "Chrome", "Google", "Gmail", or any Google mark, and the icon does not imitate Chrome's. This complies with the [Chrome Web Store Branding Guidelines](https://developer.chrome.com/docs/webstore/branding). The listing describes the product as *for Chrome*, never *by Google*.
- **Reference product:** Tabcove does not use OneTab's name, mark, icon, colour, copy, layout, or trade dress anywhere — including in the store listing, where OneTab is referenced only as a factual import-source compatibility note (`Import from OneTab`), which is nominative fair use.

**Recommended follow-up (owner action, not a launch blocker):** before filing any trademark application, run a formal clearance search on the USPTO TESS/Trademark Search system and the EUIPO register for `TABCOVE` in Classes 9 and 42. Web search is a good screen, not a legal clearance.

---

## 4. Branding rationale (summary)

Full detail in [`branding.md`](branding.md).

| Element | Decision | Rationale |
|---|---|---|
| **Name** | Tabcove | Shelter metaphor = durability promise; `tab` token = store SEO |
| **Tagline** | A safe harbour for every tab. | States the differentiator, not the category |
| **Mark** | A cove: a rounded harbour arm cradling three stacked tab bars | Reads at 16 px; nothing in the category looks like it |
| **Primary colour** | Deep harbour teal `#0E7C86` | Category is saturated with blue (OneTab), orange (Toby), and purple (Workona). Teal is unclaimed, calm, and trustworthy. |
| **Accent** | Beacon amber `#F2A33C` | A single warm point of light — used only for the one action that matters on a screen |
| **Typeface** | System UI stack (`Inter` where available) | Zero webfont bytes, zero network requests, native feel on every OS |
| **Voice** | Plain, calm, specific. No exclamation marks, no hype. | The product sells trust; trust does not shout. |

---

## 5. Folder structure

```
Tabcove/
├─ README.md                      Project readme, install + build instructions
├─ CHANGELOG.md                   Semantic-versioned change history
├─ LICENSE                        MIT (source), with brand-asset carve-out
├─ .gitignore
│
├─ docs/                          Full product documentation set
│  ├─ project-overview.md         ← this file
│  ├─ market-research.md          Competitor + opportunity analysis
│  ├─ product-strategy.md         Personas, positioning, growth, retention
│  ├─ branding.md                 Name, mark, palette, type, voice
│  ├─ ux-plan.md                  Flows, wireframes, states, accessibility
│  ├─ architecture.md             MV3 architecture, storage, performance
│  ├─ roadmap.md                  Milestones, timeline, risks
│  ├─ free-vs-pro-plan.md         Free/Pro split + feature-flag design
│  ├─ compliance.md               Chrome policy + permission justification
│  ├─ privacy-policy.md           Source of the published policy
│  ├─ terms.md                    Source of the published terms
│  ├─ testing-report.md           Test plan + executed results
│  ├─ growth-plan.md              Route to 5,000 users
│  ├─ store-listing.md            Final store copy + screenshot plan
│  └─ progress.md                 Live milestone tracker
│
├─ extension/                     The shipping extension (this is what is zipped)
│  ├─ manifest.json               Manifest V3
│  ├─ background/
│  │  └─ service-worker.js        Commands, context menus, alarms, install flow
│  ├─ lib/                        Framework-free ES modules, no build step
│  │  ├─ constants.js             Shared enums, keys, limits
│  │  ├─ storage.js               chrome.storage wrapper, quota, safe writes
│  │  ├─ db.js                    Sharded collection store + index + migrations
│  │  ├─ snapshots.js             Rolling restore points
│  │  ├─ trash.js                 30-day undo bin
│  │  ├─ capture.js               Read open tabs, windows, groups
│  │  ├─ restore.js               Re-open tabs, windows, groups
│  │  ├─ search.js                Ranked incremental search
│  │  ├─ exporter.js              JSON / HTML / Markdown / CSV / plain text
│  │  ├─ importer.js              Tabcove JSON, OneTab text, plain URL lists
│  │  ├─ settings.js              Typed settings with defaults + migration
│  │  ├─ flags.js                 Feature flags — the Free/Pro gate
│  │  ├─ license.js               License verification seam (stub in v1)
│  │  ├─ format.js                Dates, counts, hostnames, byte sizes
│  │  ├─ dom.js                   Tiny safe DOM helpers (no innerHTML on data)
│  │  ├─ virtual-list.js          Windowed renderer for very large libraries
│  │  └─ toast.js                 Accessible, undo-capable notifications
│  ├─ popup/                      The 360 px quick-action surface
│  ├─ library/                    The full-page manager
│  ├─ options/                    Settings, backup, import/export, danger zone
│  ├─ welcome/                    First-run onboarding
│  ├─ styles/                     tokens.css · base.css · components.css
│  ├─ icons/                      16 / 32 / 48 / 128 PNG + SVG master
│  └─ _locales/en/messages.json   i18n scaffold (store-ready for translation)
│
├─ site/                          GitHub Pages source (privacy policy host)
│  ├─ index.html
│  ├─ privacy.html
│  ├─ terms.html
│  ├─ site.css
│  └─ icon-128.png
│
├─ tools/                         Build + asset generation (dev only, not shipped)
│  ├─ make-icons.py               Generates the whole icon set from code
│  ├─ make-promo.py               Generates store promo tiles
│  ├─ make-screenshots.py         Renders the 1280×800 store screenshots
│  ├─ shots.html                  Screenshot stage
│  ├─ build.py                    Validates + produces the release ZIP
│  ├─ validate.py                 Manifest / policy / asset self-audit
│  └─ test.mjs                    Headless unit tests for lib/ modules
│
├─ screenshots/                   Generated 1280×800 store screenshots
├─ release/                       Versioned build output
└─ Store Upload/                  Everything needed to submit, in one folder
   ├─ Extension.zip
   ├─ 0-Account/        publisher name, verified e-mail, 2SV, trader status
   ├─ 1-Package/        the upload, and what to verify when it lands
   ├─ 2-Store-listing/  title, description, 5 screenshots, promo tiles
   ├─ 3-Privacy/        single purpose, permissions, data usage, policy URL
   ├─ 4-Distribution/   visibility, pricing, ads, IAP, regions
   └─ Upload Guide.md

Each surface folder carries a `fields.json` enumerating every field that
dashboard surface presents. `tools/build.py` walks those manifests and fails if
any field has no answer — so the build asks "does every field have an answer?"
rather than "did someone remember this file?"
```

### Why this layout

- **`extension/` is the ZIP root.** The build copies that directory verbatim; nothing else can accidentally ship. No dev files, no docs, no source maps in the package.
- **No build step for the extension.** Plain ES modules, no bundler, no minifier, no transpiler. Chrome reviewers read the exact source that runs, which shortens review and eliminates the "obfuscated code" rejection class.
- **`tools/` is Python + Node, and is never shipped.** All brand assets are *generated from code*, so a brand change regenerates icons, promo tiles, and screenshots consistently and the listing can never drift from the product.
- **`site/` is deployed to GitHub Pages** to host the privacy policy at a stable public URL, as required by the Chrome Web Store.

---

## 6. What ships in v1.0.0

Free, forever, with no account and no network access:

1. **Stow** — all tabs, this tab, other tabs, or the current window, in one click or one keystroke.
2. **Library** — a searchable, sortable, virtualised list of every collection.
3. **Instant search** — ranked matching over titles, URLs, hostnames, and collection names.
4. **Groups & pins preserved** — Chrome tab-group names and colours, and pinned state, survive the round trip.
5. **Non-destructive restore** — opening a collection never deletes it, unless you turn that on.
6. **Restore points** — up to 10 automatic snapshots, restorable from the UI.
7. **Undo bin** — deleted collections recoverable for 30 days.
8. **Export** — JSON, HTML, Markdown, CSV, and plain text, in one click.
9. **Import** — from Tabcove JSON, OneTab text, or any plain list of URLs.
10. **Backup reminder** — a dismissible nudge when your library has outgrown your last backup.
11. **Duplicate finder** — detect and merge duplicate links across collections.
12. **Command palette** — `Ctrl/⌘ + K` for everything.
13. **Dark mode + WCAG 2.1 AA** — real theming, full keyboard operation, screen-reader labelling.

See [`free-vs-pro-plan.md`](free-vs-pro-plan.md) for the Pro roadmap and the feature-flag seam that makes it possible without a rewrite.
