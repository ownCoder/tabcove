<div align="center">

<img src="site/icon-128.png" width="88" height="88" alt="Tabcove">

# Tabcove

**A safe harbour for every tab.**

Save all your Chrome tabs in one click — and actually get them back.

[![Version](https://img.shields.io/badge/version-1.0.0-0E7C86)](CHANGELOG.md)
[![Manifest](https://img.shields.io/badge/manifest-v3-0E7C86)](extension/manifest.json)
[![Permissions](https://img.shields.io/badge/host%20permissions-none-1F8A4C)](docs/compliance.md)
[![Licence](https://img.shields.io/badge/licence-MIT-5A6B6F)](LICENSE)

[Privacy policy](https://owncoder.github.io/tabcove/privacy.html) ·
[Terms](https://owncoder.github.io/tabcove/terms.html) ·
[Website](https://owncoder.github.io/tabcove/) ·
[Docs](docs/)

</div>

---

## What this is

A tab manager for Chrome built around one idea the category keeps getting wrong:
**the archive itself has to be safe.**

The most-searched complaint about the market-leading tab saver is not a missing
feature — it is *"it lost all my tabs."* Tabcove is designed from that complaint
outwards.

| | |
|---|---|
| **Stow in one click** | All tabs, this tab, the others, a selection, or every window. Each button shows exactly what it will save before you press it. |
| **Instant search** | Ranked search over titles, addresses, and collection names. ~35 ms across 20,000 saved tabs. |
| **Tab groups survive** | Chrome tab groups come back with their names and colours. Pinned tabs come back pinned. Multi-window layouts are rebuilt. |
| **Restore points** | A snapshot of the whole library is taken automatically before anything destructive. Roll back in one click. |
| **30-day undo bin** | Deleted collections stay recoverable for a month. Nothing is destroyed by a single click. |
| **Non-destructive restore** | Opening a collection does not consume it. A library you empty by reading from it is not a library. |
| **Export in five formats** | JSON, HTML, Markdown, CSV, plain text. Import from OneTab, from a Tabcove backup, or from any list of addresses. |
| **Backup reminders** | A quiet, dismissible nudge when the library has grown past your last export. |
| **Duplicate finder** | Detect and merge duplicates across the whole library, keeping the oldest copy. |
| **Keyboard-first** | `Ctrl/⌘ + K` command palette. Every action reachable without a mouse. |
| **Real dark mode** | Full theming, WCAG 2.1 AA contrast, visible focus, reduced-motion support. |
| **Fast at any size** | Sharded storage and a windowed list renderer: 20,000 saved tabs feels like 20. |

---

## Privacy

Tabcove has **no host permissions**, **no content scripts**, and **no networking
code at all**. It cannot read or modify any web page, and it has no way to send
anything anywhere.

That is a checked invariant, not a promise: `tools/validate.py` fails the build if
`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, or any
remotely-hosted script or stylesheet ever appears in the source.

| Permission | Why |
|---|---|
| `tabs` | Read the title and address of your open tabs, and close them when you ask |
| `tabGroups` | Save and rebuild Chrome tab groups with their names and colours |
| `storage` | Keep your library on your device |
| `unlimitedStorage` | Lift Chrome's 10 MB extension cap so a large library keeps working |
| `contextMenus` | The right-click "Stow" actions |
| `favicon` | Site icons from Chrome's **local** cache — so no remote favicon service ever sees your addresses |
| `alarms` | Sweep the undo bin and check whether a backup is due |

The source is not minified or obfuscated. What you read is exactly what runs.

---

## Free, and staying free

**Every feature in v1.0.0 stays free, forever, with no limits on collections or
tabs.** Paid features are planned for a future version — encrypted cloud sync,
automation rules, AI grouping — but they will be additions, never the removal of
something that works today.

This is written down here on purpose. The two clearest cautionary tales in this
category are products whose ratings collapsed after they moved existing features
behind a paywall or an account. See [`docs/free-vs-pro-plan.md`](docs/free-vs-pro-plan.md).

---

## Install

### From the Chrome Web Store

Search for **Tabcove** in the Chrome Web Store, or use the link on the
[website](https://owncoder.github.io/tabcove/).

### From source

```bash
git clone https://github.com/ownCoder/tabcove.git
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → select the `extension/` directory.

There is no build step and no dependencies. `extension/` is the shipping product.

---

## Repository layout

```
extension/     the shipping extension — this directory is what gets zipped
  manifest.json
  background/  service worker: commands, context menus, alarms
  lib/         framework-free ES modules (storage, db, capture, restore, search…)
  popup/ library/ options/ welcome/   the four UI surfaces
  styles/      tokens.css · base.css · components.css
  icons/       16 / 32 / 48 / 128
docs/          the full product documentation set — 15 documents
site/          GitHub Pages source: privacy policy, terms, landing page
tools/         asset generation, validation, tests, packaging (never shipped)
screenshots/   generated 1280×800 store screenshots
release/       versioned build output
Store Upload/  everything needed to submit, in one folder
```

---

## Development

```bash
node tools/test.mjs           # 54 unit tests against a chrome.storage mock
python tools/validate.py      # manifest, permissions, network, XSS, asset audit
node tools/drive.mjs verify   # load in real Chrome, check every surface renders
node tools/drive.mjs shots    # capture screenshots from the running extension
python tools/make-icons.py    # regenerate the icon set from code
python tools/make-promo.py    # regenerate the store promo tiles
python tools/build.py         # validate, test, and produce the release ZIP
```

`tools/` needs Python with Pillow, and Node 22+. Neither ships in the extension.

### Design notes worth knowing before you edit

- **Sharded storage.** One `chrome.storage` record per collection, plus a small
  index. Saving 20 tabs writes ~2 KB, not the whole library, and a corrupt record
  costs one collection rather than everything.
- **Write before close.** `capture.js` only calls `chrome.tabs.remove` after the
  storage write resolves. A failed save can never cost you a tab.
- **Snapshot before destroy.** Every delete, wipe, import, and migration calls
  `snapshots.capture()` first.
- **Data never becomes markup.** Page titles come from arbitrary websites, so all
  data reaches the DOM through `textContent`. `validate.py` enforces it.
- **The service worker holds no state.** MV3 kills it aggressively; every UI
  surface reads storage directly rather than paying a cold start on each click.

---

## Documentation

| Document | What it covers |
|---|---|
| [project-overview.md](docs/project-overview.md) | Name selection, trademark clearance, folder structure |
| [market-research.md](docs/market-research.md) | Competitors, feature matrix, opportunity analysis |
| [product-strategy.md](docs/product-strategy.md) | Personas, positioning, retention, monetisation |
| [branding.md](docs/branding.md) | Name, mark, palette, type, voice |
| [ux-plan.md](docs/ux-plan.md) | Flows, wireframes, every empty/loading/error state, a11y |
| [architecture.md](docs/architecture.md) | MV3 architecture, storage schema, performance budget |
| [roadmap.md](docs/roadmap.md) | Milestones, timeline, risk register |
| [free-vs-pro-plan.md](docs/free-vs-pro-plan.md) | The Free/Pro line and the feature-flag seam |
| [compliance.md](docs/compliance.md) | Chrome policy audit and permission justification |
| [testing-report.md](docs/testing-report.md) | Test plan and executed results |
| [growth-plan.md](docs/growth-plan.md) | The route to 5,000 users |
| [store-listing.md](docs/store-listing.md) | Final listing copy and screenshot plan |
| [progress.md](docs/progress.md) | Live milestone tracker |

---

## Licence

Source code: [MIT](LICENSE).

**The Tabcove name, logo, and icon set are excluded** and remain the property of
ownCoder. Forks must ship under a different name and mark — see the LICENSE file
for why that restriction exists in this particular category.

---

<div align="center">
<sub>Built by <a href="https://github.com/ownCoder">ownCoder</a>. Not affiliated with Google or with any other tab manager.</sub>
</div>
