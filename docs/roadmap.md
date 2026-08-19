# Roadmap — Tabcove

**Version:** 1.0
**Date:** 19 August 2026
**Versioning:** [Semantic Versioning 2.0.0](https://semver.org/) — `MAJOR.MINOR.PATCH`

---

## 1. Release ladder

| Version | Name | Status | Content |
|---|---|---|---|
| **0.1.0** | Foundation | Done | Scaffold, manifest, storage layer, capture/restore |
| **0.2.0** | Library | Done | Library UI, virtualised list, search, tab groups |
| **0.3.0** | Durability | Done | Restore points, undo bin, undo toasts |
| **0.4.0** | Portability | Done | Export ×5, import ×3, backup reminder |
| **0.5.0** | Polish | Done | Options, welcome, command palette, a11y, dark mode |
| **1.0.0** | **Store launch** | **Ready to submit** | Icons, screenshots, docs, compliance audit, ZIP |
| 1.1.0 | Listen | Planned | Whatever the first 500 users actually ask for |
| 1.2.0 | Side panel | Planned | Persistent side-panel library |
| 1.3.0 | Sessions | Planned | Optional auto-capture of window sessions on close |
| 1.4.0 | Locale | Planned | 8 languages. The manifest already resolves its name and description through `chrome.i18n`, so `_locales` is live rather than dead payload |
| **2.0.0** | **Pro** | Gated | Cloud sync, AI grouping, automation — see `free-vs-pro-plan.md` |

---

## 2. Milestones — build phase (complete)

| # | Milestone | Deliverable | Exit criterion | Status |
|---|---|---|---|---|
| M0 | Research | `market-research.md` | Competitors profiled; differentiators chosen | ✅ |
| M1 | Strategy | `product-strategy.md`, `free-vs-pro-plan.md` | Personas, USP, Free/Pro line fixed | ✅ |
| M2 | Brand | `branding.md`, icon set | Name cleared, palette contrast-verified, icons generated | ✅ |
| M3 | UX | `ux-plan.md` | Every screen has all 5 states specified | ✅ |
| M4 | Architecture | `architecture.md` | Storage schema, permission set, perf budget fixed | ✅ |
| M5 | Core engine | `lib/*` | Unit tests green | ✅ |
| M6 | UI | popup, library, options, welcome | All flows operable by keyboard | ✅ |
| M7 | Durability | snapshots, trash, undo | No single action can destroy data irrecoverably | ✅ |
| M8 | Portability | exporter, importer | Round-trip export → import is lossless | ✅ |
| M9 | QA | `testing-report.md` | Full matrix executed; no open blockers | ✅ |
| M10 | Compliance | `compliance.md` | Permission audit passed; policy self-audit passed | ✅ |
| M11 | Legal | privacy policy + terms on GitHub Pages | Live public URL | ✅ |
| M12 | Store assets | screenshots, promo tiles, listing copy | 5 screenshots at 1280×800, both promo sizes | ✅ |
| M13 | Package | `Store Upload/` | ZIP loads unpacked with zero errors | ✅ |

---

## 3. Post-launch timeline

| Window | Focus | Concrete actions |
|---|---|---|
| **Week 0** | Submit | Upload, answer the permission-justification form, publish the GitHub repo |
| **Weeks 1–2** | Watch | Monitor reviews daily. Reply to every one. Hotfix any crash within 48 h. |
| **Weeks 3–4** | Listen | Tally feature requests. Ship 1.0.x patches only — no features yet. |
| **Weeks 5–8** | 1.1.0 | Build the top 3 requested items. Product Hunt launch once ratings ≥ 4.6 with ≥ 25 reviews. |
| **Weeks 9–16** | 1.2.0 | Side panel. First 3 short-form videos. Push for round-up inclusion. |
| **Weeks 17–24** | 1.3.0 + 1.4.0 | Session auto-capture; localisation into the top 8 store languages. |
| **Week 24+** | Gate check | If ≥ 5,000 users, ≥ 4.5 stars, ≥ 100 reviews, ≥ 35% W4 retention → start 2.0.0 (Pro). |

---

## 4. Risks

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | **Store rejection over permissions** | Medium | High | Only 7 permissions, none broad; no host permissions; a written justification per permission ready to paste into the review form (`Store Upload/3-Privacy/Permissions-Justification.txt`). `unlimitedStorage` and `favicon` are the two a reviewer may query, and both have a one-sentence answer. | Release Mgr |
| R2 | **Zero discovery — the listing never ranks** | High | High | The store is a search engine: title carries two head keywords, the description front-loads them, and 5 screenshots each carry a legible caption. Reinforced by the growth plan's rescue-content strategy. | Growth |
| R3 | **A data-loss bug — fatal for a product sold on durability** | Low | Critical | Storage is sharded; restore points precede every destructive op; capture writes before it closes tabs; migrations are snapshot-protected; the round-trip is unit-tested. A data-loss report is a same-day hotfix, no exceptions. | QA |
| R4 | **OneTab ships search and backup** | Low | Medium | They have shipped roughly one meaningful change per year and a rewrite risks 2M users' data. Even if they do, permissions minimalism, tab-group fidelity, and speed remain ours. | PM |
| R5 | **A well-funded entrant** | Medium | Medium | They will require an account. That is the moat: our whole position is "no account, nothing leaves the device". | PM |
| R6 | **Chrome API change breaks the extension** | Low | High | Only stable, long-lived APIs are used (`tabs`, `tabGroups`, `windows`, `storage`, `alarms`). `minimum_chrome_version` is declared. No use of deprecated or preview APIs. | Eng |
| R7 | **Bad early reviews from a first-run misunderstanding** | Medium | Medium | The welcome page states plainly that stowing closes tabs and that everything is recoverable. The first stow shows an undo toast. Reply to every review. | PM |
| R8 | **Storage quota exhaustion for heavy users** | Low | Medium | `unlimitedStorage` plus a permanently visible meter, a warning at 75%, and a duplicate finder to reclaim space. | Eng |
| R9 | **Name conflict emerges later** | Low | Medium | Cleared across the Chrome Web Store and general software search. Formal USPTO/EUIPO clearance recommended before any filing. | Owner |
| R10 | **Solo-maintainer bus factor** | Medium | Medium | No build step, no dependencies, heavy in-code comments, and complete documentation. Anyone can pick this up cold. | Owner |

---

## 5. Dependencies

### External

| Dependency | Type | Risk | Note |
|---|---|---|---|
| Chrome Extensions MV3 platform | Hard | Low | Stable APIs only |
| Chrome Web Store review | Hard, external | Medium | 1–5 business days typical; permission questions are the usual cause of delay |
| GitHub Pages | Hard | Low | Hosts the privacy policy; the store requires a public URL |
| Developer account | Satisfied | — | Verified, two extensions already published |

### Internal (runtime)

**None.** Zero npm packages, zero CDNs, zero webfonts, zero remote assets. `tools/` uses Python + Pillow for asset generation and Node for tests — neither ships.

---

## 6. Pre-submission checklist

### Code

- [x] Manifest V3, valid JSON, version `1.0.0`
- [x] `minimum_chrome_version` declared
- [x] No `host_permissions`, no content scripts, no `web_accessible_resources`
- [x] CSP: `script-src 'self'; object-src 'self'; base-uri 'none'`
- [x] No `eval`, `new Function`, inline handlers, or remote scripts
- [x] No `fetch` / `XMLHttpRequest` / `WebSocket` / `sendBeacon` anywhere
- [x] No `innerHTML` assignment from data
- [x] Every Chrome API call checks `chrome.runtime.lastError`
- [x] Unit tests pass
- [x] Loads unpacked with zero console errors or warnings

### Assets

- [x] Icons 16 / 32 / 48 / 128 PNG, transparent-safe, legible at 16 px
- [x] 5 screenshots at 1280 × 800
- [x] Small promo tile 440 × 280
- [x] Marquee promo tile 1400 × 560
- [x] All assets generated from code and reproducible

### Listing

- [x] Title ≤ 75 chars, carries two head keywords
- [x] Short description ≤ 132 chars
- [x] Long description with keywords front-loaded
- [x] Category: Productivity → Workflow & Planning
- [x] Single-purpose statement written
- [x] Per-permission justification written
- [x] Privacy practices disclosure answers prepared

### Legal

- [x] Privacy policy published on GitHub Pages with a live URL
- [x] Terms of use published
- [x] "No data collected" declaration matches the code exactly
- [x] Licence with brand carve-out

### Package

- [x] `Store Upload/Extension.zip` contains only `extension/` contents
- [x] ZIP under 10 MB
- [x] Version inside the ZIP matches the release
- [x] ZIP re-verified by loading it unpacked
