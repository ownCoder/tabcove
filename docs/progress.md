# Progress Tracker — Tabcove

**Current version:** 1.0.0
**Status:** Complete and ready for Chrome Web Store submission
**Last updated:** 19 August 2026

---

## Milestone status

| # | Milestone | Deliverable | Status | Evidence |
|---|---|---|---|---|
| M0 | Market research | `market-research.md` | ✅ Done | Competitor profiles, feature matrix, positioning map, sourced |
| M1 | Product strategy | `product-strategy.md`, `free-vs-pro-plan.md` | ✅ Done | 4 personas, USP, Free/Pro line, 5,000-user roadmap |
| M2 | Branding | `branding.md`, icon set | ✅ Done | Name cleared, palette contrast-verified, icons generated from code |
| M3 | UX design | `ux-plan.md` | ✅ Done | Flows, wireframes, all 5 states per surface, a11y spec |
| M4 | Architecture | `architecture.md` | ✅ Done | Storage schema, permission set, performance budget |
| M5 | Core engine | `extension/lib/*` | ✅ Done | 15 modules, 54 unit tests green |
| M6 | UI surfaces | popup, library, options, welcome | ✅ Done | All 4 render in real Chrome with zero console errors |
| M7 | Durability | snapshots, trash, undo | ✅ Done | Verified end-to-end against real Chrome |
| M8 | Portability | exporter, importer | ✅ Done | 5 export formats, 3 import formats, lossless round trip |
| M9 | QA | `testing-report.md` | ✅ Done | 54 unit + 30 functional + 159 audit checks, all passing |
| M10 | Compliance | `compliance.md` | ✅ Done | 7 permissions justified, 0 host permissions, audit passing |
| M11 | Legal | Privacy policy + terms, published | ✅ Done | Live at owncoder.github.io/tabcove — HTTP 200 verified |
| M12 | Store assets | screenshots, promo tiles, listing copy | ✅ Done | 8 × 1280×800 screenshots, both promo tiles, all text assets |
| M13 | Package | `Store Upload/` | ✅ Done | 106 KB ZIP, verified by loading the extraction in Chrome |

---

## Deliverables checklist

### Documentation — 15 of 15

- [x] `project-overview.md` — name, trademark clearance, folder structure
- [x] `market-research.md` — competitors, matrix, opportunity, sources
- [x] `product-strategy.md` — personas, USP, retention, monetisation
- [x] `branding.md` — name, mark, palette, type, voice, asset inventory
- [x] `ux-plan.md` — flows, wireframes, states, keyboard model, a11y
- [x] `architecture.md` — MV3 design, storage, capture/restore, security
- [x] `roadmap.md` — milestones, timeline, risk register, dependencies
- [x] `free-vs-pro-plan.md` — the Free/Pro line and the feature-flag seam
- [x] `compliance.md` — policy audit and permission justification
- [x] `privacy-policy.md` — source of the published policy
- [x] `terms.md` — source of the published terms
- [x] `testing-report.md` — full test plan and executed results
- [x] `growth-plan.md` — the route to 5,000 users
- [x] `store-listing.md` — final listing copy and screenshot plan
- [x] `progress.md` — this file

### Extension — 39 files, 299 KB unpacked

- [x] `manifest.json` — Manifest V3, 7 permissions, 0 host permissions
- [x] `background/service-worker.js` — stateless: install, commands, menus, alarms
- [x] `lib/` — 15 modules: constants, storage, db, snapshots, trash, capture, restore, search, exporter, importer, settings, flags, license, format, dom, toast, virtual-list
- [x] `popup/` — capture surface with live counts
- [x] `library/` — full manager, search, palette, restore points, undo bin
- [x] `options/` — settings, backup, import, maintenance, privacy, danger zone
- [x] `welcome/` — first-run, one action
- [x] `styles/` — tokens, base, components
- [x] `icons/` — 16 / 32 / 48 / 128, generated from code
- [x] `_locales/en/messages.json` — i18n scaffold

### Tooling — 12 scripts

- [x] `make-icons.py` — the icon set and SVG master, from constants
- [x] `make-promo.py` — both store promo tiles
- [x] `make-screenshots.py` — composes 1280×800 store tiles with captions
- [x] `make-store-text.py` — generates the listing text from `store-listing.md`, and verifies every Privacy-tab answer exists
- [x] `validate.py` — 159-check policy and security self-audit
- [x] `build.py` — validates, tests, checks submission completeness, packages, verifies the ZIP
- [x] `test.mjs` — 54 unit tests against a `chrome.storage` mock
- [x] `drive.mjs` — loads the real extension in Chrome; verify and screenshot
- [x] `functional.mjs` — 30 end-to-end tests against the real Chrome APIs
- [x] `perf.mjs` — measures the numbers quoted in the documentation
- [x] `serve.py`, `harness.html` — local QA

### Legal and hosting

- [x] GitHub repository — https://github.com/ownCoder/tabcove
- [x] GitHub Pages site — https://owncoder.github.io/tabcove/
- [x] **Privacy policy — https://owncoder.github.io/tabcove/privacy.html (verified live)**
- [x] Terms of use — https://owncoder.github.io/tabcove/terms.html
- [x] `LICENSE` — MIT with an explicit brand carve-out

### Store Upload package — organised by dashboard tab

- [x] `Extension.zip` — 106 KB, verified by loading the extraction in Chrome
- [x] `Upload Guide.md` — field map per tab, upload order, publish checklist

**Privacy tab** — every field the dashboard asks for:

- [x] `3-Privacy/_Answers.md` — the whole tab, in dashboard order
- [x] `Privacy/Single-Purpose.txt` — the single purpose statement
- [x] `Privacy/Permissions-Justification.txt` — one per permission, all 7
- [x] `Privacy/Data-Usage-Declarations.txt` — 9 categories + 3 certifications
- [x] `Privacy/Privacy-Policy-URL.txt` — the published URL
- [x] `Privacy/Privacy-Policy.md`, `Privacy/Terms-of-Use.md` — offline copies

**Store listing + Distribution tabs:**

- [x] `2-Store-listing/Text/` — title, summary, description, metadata, keywords, promo copy, release notes
- [x] `2-Store-listing/Screenshots/` — **5** files (the store's maximum), all exactly 1280×800
- [x] `2-Store-listing/Extras/` — 3 more, composed but deliberately not uploaded
- [x] `2-Store-listing/Promo/` — 440×280 and 1400×560
- [x] `2-Store-listing/Icons/` — 16 / 32 / 48 / 128

---

## Verification log

Every claim in the documentation is backed by a command that can be re-run.

| Check | Command | Result |
|---|---|---|
| Unit tests | `node tools/test.mjs` | **54 passed, 0 failed** |
| Functional tests (real Chrome) | `node tools/functional.mjs` | **30 passed, 0 failed** |
| Functional tests (the release ZIP) | `node tools/functional.mjs <extracted>` | **30 passed, 0 failed** |
| Policy + security audit | `python tools/validate.py` | **159 checks, 0 errors** |
| WCAG contrast | `python tools/validate.py --contrast` | **12 pairs, all PASS** |
| Surfaces render in Chrome | `node tools/drive.mjs verify` | **4 surfaces, 0 console errors** |
| Release ZIP renders in Chrome | `node tools/drive.mjs verify <extracted>` | **4 surfaces, 0 console errors** |
| Performance at 20,000 tabs | `node tools/perf.mjs` | **All budgets met** |
| Full build | `python tools/build.py` | **PASSED — 106 KB package** |
| Privacy policy live | `curl -I .../privacy.html` | **HTTP 200** |

---

## Bugs found and fixed during development

Recorded because they are the evidence that the verification actually verifies something.

| # | Bug | Found by | Fix |
|---|---|---|---|
| 1 | `mergeDuplicates` kept the **newest** copy, not the oldest — the index is newest-first, so "keep the first hit" meant the wrong one | Unit test | `findDuplicates` now sorts each group's hits by `collectionCreatedAt` ascending |
| 2 | Two snapshots taken in the same millisecond collided on their storage key, silently destroying the first | Unit test | `snapshots.capture` steps the timestamp forward until the key is free |
| 3 | The command palette was visible on page load — `.dialog-backdrop { display: flex }` outranks the user agent's `[hidden] { display: none }` | Real-browser screenshot | `[hidden] { display: none !important }` added to `base.css` |
| 4 | Tab-group colours never rendered — `Object.assign(element.style, …)` silently drops CSS custom properties | Real-browser screenshot | `el()` routes `--*` keys through `style.setProperty` |
| 5 | `--load-extension` is ignored by Chrome 137+, so the first verification runs were testing an extension that had never loaded | Target inspection | The driver installs via the CDP `Extensions.loadUnpacked` domain and reads back the real id |
| 6 | Storage meter showed "0%" for a non-empty library | Screenshot review | Shows "under 1%" when usage is above zero but rounds to zero |
| 7 | `restore.js` used a hoisted `var` for the batch start index across an if/else | Code review | Declared with `let` before the branch |
| 8 | The **single purpose** statement and the permission justifications lived under a generic assets folder — both are *Privacy-tab* fields. A submitter working the Privacy tab opened `3-Privacy/`, did not find them, and reported the single purpose as missing | **User, during submission** | The package is organised by dashboard **surface**, and `build.py` walks a per-surface `fields.json` instead of a hand-written file list |
| 9 | **"Web history" was declared as No.** The reasoning — "local-only storage is not collection" — is specifically foreclosed by Google's User Data FAQ, which requires disclosure "even when data is processed or stored locally". Tabcove stores saved tab URLs, titles, and times, and the listing says so openly, so the declaration contradicted the listing | Multi-agent dashboard audit, verified against Google's docs | Web history is now ticked, the reasoning rewritten from rebuttal to affirmative disclosure, and prominent disclosure added to the listing, the welcome page, the options page, and the policy. `build.py` fails if it is ever unticked again |
| 10 | **Trader status was filed under the Distribution tab** and justified with the wrong legal test ("nothing is monetised"). It is an Account-page field, and the DSA test is whether you act for purposes relating to a trade, business, craft, or profession | Multi-agent dashboard audit | Moved to a new `0-Account/` surface with the correct test and the triggers that would change the answer |
| 11 | **The store accepts a maximum of 5 screenshots.** Eight were generated and the guide said "upload all eight" | Multi-agent dashboard audit, confirmed against Chrome's image docs | Five are staged for upload in a deliberate order; three are composed into `Extras/`. `build.py` fails if more than five are staged |
| 12 | **"Contains ads" and "In-app purchases" had no answer anywhere** in the package — they lived only in the strategy document and never crossed into the submission | Multi-agent dashboard audit | Both answered on the new `4-Distribution/` surface |
| 13 | `build.py` **crashed instead of reporting a problem** on a Windows console: its error message used `→`, which cp1252 cannot encode | Negative-testing the new completeness gate | All Python tool output is ASCII; a check verifies no non-ASCII remains in a console path |
| 14 | `lib/flags.js` and `lib/license.js` shipped as **unreachable dead code**, including a flag named `analytics` inside an extension whose listing says "no analytics" | Multi-agent dashboard audit | Both are now imported by the options page to render the licence tier, and the flag is named `tabInsights` with a comment explaining what it is |
| 15 | `_locales/en/messages.json` shipped but nothing used `chrome.i18n`, so `default_locale` was declared over dead payload | Multi-agent dashboard audit | The manifest resolves its name, short name, and description through `__MSG_` placeholders. `tools/check-i18n.mjs` proves Chrome resolves them |
| 16 | The site's hero call-to-action linked to the Chrome Web Store **front page** — a dead link on the very page reviewers open | Multi-agent dashboard audit | Points at the repository, and says the listing is in review, until approval |

---

## Open items

**None blocking submission.**

| Item | Owner | When |
|---|---|---|
| Formal USPTO/EUIPO clearance search for `TABCOVE` in Classes 9 and 42 | Owner | Before filing any trademark application. Web search is a screen, not a clearance. |
| Replace the placeholder Chrome Web Store link on `site/index.html` | Owner | After approval |
| Tag `v1.0.0` and create the GitHub release | Owner | After approval |

---

## Next actions, in order

1. Open `Store Upload/Upload Guide.md` and follow it top to bottom.
2. Submit for review.
3. On approval: update the site's store link, tag `v1.0.0`, publish the GitHub release.
4. Weeks 1–2: reply to every review daily; hotfix any crash within 48 hours.
5. Week 3: start `docs/growth-plan.md` at the seeding stage — not at Product Hunt.
