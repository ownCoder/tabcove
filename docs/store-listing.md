# Chrome Web Store Listing — Tabcove

**Version:** 1.0.0
**Date:** 19 August 2026
**Status:** Final. Each field below is also saved as a plain-text file in `Store Upload/Store Assets/Text/` so it can be pasted without reformatting.

---

## 1. Title

```
Tabcove — Tab Manager & Session Saver
```

37 of 75 characters.

**Reasoning.** Store search weights the extension name heavily, so the title has to carry the brand *and* the two head keywords. `tab manager` and `session saver` are the category's highest-volume terms; `Tabcove` also contains the token `tab`, so the brand itself contributes to relevance instead of costing it.

Rejected alternatives:

| Candidate | Why not |
|---|---|
| `Tabcove` alone | Zero keyword surface. A new brand nobody searches for. |
| `Tabcove — Save Tabs, Session Manager, Tab Organizer, OneTab Alternative` | Keyword stuffing. A policy risk and it reads as spam. |
| `Tabcove: The Best Tab Manager` | Superlative claim — a deception-policy risk with nothing to back it. |

---

## 2. Short description

```
Save all your tabs in one click and get them back. Search, tab groups, restore points, undo bin, backups. 100% local, no account.
```

128 of 132 characters.

Front-loads the action, then the differentiator, then the trust signal. This string also appears in `manifest.json` as `description`, so the two can never disagree.

---

## 3. Detailed description

```
Tabcove saves every tab you have open into one searchable list, in a single click — and makes sure you can always get them back.

Most tab savers do the first half well. The complaint you find everywhere about them is the second half: the saved list gets lost, and years of research goes with it. Tabcove is built the other way round, starting from that failure.


━━━ WHAT IT DOES ━━━

STOW IN ONE CLICK
Save all your tabs, just this tab, all the others, a selection, or every window at once. Each button shows you exactly what it will save before you press it — "12 tabs · 2 groups" — so you always know what is about to happen.

FIND ANY TAB IN A SECOND
Search across every saved title, web address, and collection name. Ranked, instant, and still under 40 milliseconds with 20,000 tabs saved. A saved list you cannot search is a list you will never read again.

YOUR TAB GROUPS SURVIVE
Chrome tab groups come back with their names and their colours. Pinned tabs come back pinned. If you saved three windows, you get three windows. Most tab savers flatten all of that into a plain list.

RESTORE POINTS
Before anything destructive happens, Tabcove saves a snapshot of your whole library. Ten are kept. If something goes wrong — or you simply change your mind — roll the whole library back in one click. Rolling back is itself undoable.

A 30-DAY UNDO BIN
Deleted a collection by accident? It waits in the bin for a month. Nothing in Tabcove is destroyed by a single click, ever.

RESTORING DOESN'T EMPTY YOUR LIST
Opening a collection leaves it in your library. A library you empty by reading from it is not a library. (If you prefer the other behaviour, there's a setting.)

YOUR DATA, PORTABLE
Export everything as JSON, HTML, Markdown, CSV, or plain text, in one click. The HTML export is a self-contained page of clickable links that opens in any browser with nothing installed — the format to hand yourself in ten years.

IMPORT WHAT YOU ALREADY HAVE
Coming from another tab saver? Paste its exported list and Tabcove turns it into a structured library. It reads OneTab's text format, its own JSON backups, and any plain list of web addresses. A restore point is saved first, so an import is never a one-way door.

BACKUP REMINDERS
Local storage is not forever, and Tabcove says so. When your library grows past your last export, a quiet dot appears on the toolbar icon. No pop-ups, no e-mails, and you can switch it off.

FAST AT ANY SIZE
Each collection is stored as its own record, and the list only renders what is on screen. Twenty thousand saved tabs feels the same as twenty.

BUILT FOR THE KEYBOARD
Ctrl/Cmd + K opens a command palette that reaches everything. Alt+Shift+S stows, Alt+Shift+L opens your library. Every action works without a mouse.

DARK MODE THAT IS ACTUALLY DARK
Light, dark, or follow your system. WCAG AA contrast throughout, visible focus rings, reduced-motion support, and full screen-reader labelling.


━━━ PRIVACY ━━━

Tabcove asks for NO access to any website. It has no host permissions and no content scripts, so it cannot read or change a single page you visit.

It also contains no networking code at all — no fetch, no XMLHttpRequest, no analytics, no third-party libraries, no remote fonts. That is not a promise; the build script fails if any of them ever appears in the source.

Site icons come from Chrome's own local cache rather than a remote favicon service, because a remote service would mean sending your saved addresses to somebody else's server.

No account. No sign-in. No server, because there is no backend at all.

The source code is public and is neither minified nor obfuscated. What you read is exactly what runs:
https://github.com/ownCoder/tabcove


━━━ PERMISSIONS, AND WHY ━━━

• tabs — read the title and address of your open tabs so they can be saved, and close them when you ask
• tabGroups — save and rebuild Chrome tab groups with their names and colours
• storage — keep your library on your device
• unlimitedStorage — lift Chrome's 10 MB cap so a large library keeps working instead of silently failing to save
• contextMenus — the right-click "Stow" actions
• favicon — show site icons from Chrome's LOCAL cache, so no remote service ever sees your addresses
• alarms — sweep the undo bin and check whether a backup is due

That is the complete list. There is no eighth permission.


━━━ FREE, AND STAYING FREE ━━━

Everything described above is free, with no limit on how many collections or tabs you save.

Paid features are planned for a future version — encrypted cloud sync, automation rules, AI grouping. They will be additions. Nothing you can use today will ever move behind a paywall. That commitment is written into the project's public repository and its licence.


━━━ WHO THIS IS FOR ━━━

• Researchers and students juggling several literature reviews at once
• Developers who live in Chrome tab groups and are tired of losing them
• Anyone whose laptop is on its knees under a hundred open tabs
• Anyone who will not install an extension that wants access to every website


━━━ SUPPORT ━━━

Bugs, questions, and feature requests: https://github.com/ownCoder/tabcove/issues
Privacy policy: https://owncoder.github.io/tabcove/privacy.html

Tabcove is an independent project. It is not affiliated with, endorsed by, or derived from Google or any other tab manager.
```

**Structure and why:**

1. **Line one is the whole pitch.** Most readers stop after one line; that line has to contain the action and the promise.
2. **Paragraph two names the problem** the reader already has. Naming the incumbent's failure without naming the incumbent is both more persuasive and safer under the impersonation policy.
3. **Features are headed in caps** — the store strips most formatting, so caps are the only reliable heading device.
4. **Numbers, not adjectives.** "under 40 milliseconds with 20,000 tabs saved" is checkable; "blazing fast" is not.
5. **Privacy gets its own block above the fold-ish.** It is the differentiator most likely to convert the sceptical reader who writes reviews.
6. **Permissions are listed with reasons** in the description itself. Users who read permission dialogues are exactly the users who leave five-star reviews.
7. **The free-forever commitment is explicit.** Two well-known competitors lost their ratings by breaking it.
8. **The affiliation disclaimer** at the end covers the nominative reference to OneTab.

---

## 4. Keywords

The store has no keyword field; relevance comes from the title, the short description, and the detailed description. Terms are placed deliberately.

### Primary (in the title and the first 150 characters)

| Term | Placement |
|---|---|
| tab manager | title |
| session saver | title |
| save tabs | short description, first line of the detailed description |
| tab groups | short description, feature block |

### Secondary (naturally in the detailed description)

`restore tabs` · `tab organizer` · `session manager` · `save all tabs` · `reduce tab clutter` · `chrome memory` · `tab backup` · `restore session` · `tab list` · `bookmark alternative` · `close tabs and save` · `tab search` · `tab groups backup` · `local tab manager` · `no account tab manager` · `privacy tab manager` · `export tabs`

### Long-tail intent this listing is written to catch

- "save all my tabs chrome extension"
- "tab manager that doesn't lose tabs"
- "save chrome tab groups extension"
- "onetab alternative" *(served by the import feature and the rescue content in the growth plan, never by using the trademark in the listing title)*
- "chrome using too much memory tabs"
- "tab manager no account"
- "export chrome tabs to a file"

### Explicitly avoided

Competitor brand names in the title or as standalone keywords; superlatives ("best", "#1"); unsupported claims ("AI-powered", "sync"); invisible or repeated keyword blocks.

---

## 5. Category and metadata

| Field | Value |
|---|---|
| Category | Productivity → Workflow & Planning |
| Language | English (United Kingdom) |
| Homepage URL | `https://owncoder.github.io/tabcove/` |
| Support URL | `https://github.com/ownCoder/tabcove/issues` |
| Privacy policy URL | `https://owncoder.github.io/tabcove/privacy.html` |
| Pricing | Free |
| Contains ads | No |
| In-app purchases | No |
| Regions | All |

---

## 6. Promotional text

**Small tile (440 × 280)** — `Store Upload/Store Assets/Promo/promo-small-440x280.png`

> **Tabcove** — Tab Manager & Session Saver
> **Save every tab in one click / and actually get them back.**
> Restore points · Undo bin · Instant search
> 100% local · No account · Free

**Marquee tile (1400 × 560)** — `Store Upload/Store Assets/Promo/promo-marquee-1400x560.png`

> **Tabcove** — Tab Manager & Session Saver
> **Save every tab in one click — and actually get them back.**
> Restore points · 30-day undo bin · Instant search · Tab groups kept
> Everything stays on your device. No account, no sign-in, no network access.

**Social / Product Hunt one-liner**

> The tab manager that doesn't lose your tabs. One click to save them all, instant search to find any of them, restore points and a 30-day undo bin so you always get them back. 100% local, no account, free.

---

## 7. Screenshot plan

Eight screenshots, all 1280 × 800, all captured from the **real extension running in real Chrome** by `node tools/drive.mjs shots`, then composed with captions by `python tools/make-screenshots.py`. Nothing is a mockup.

| # | File | Caption headline | What it proves |
|---|---|---|---|
| 1 | `01-library.png` | Every tab you saved, still findable | The core screen, with two coloured tab groups intact — the thing competitors flatten |
| 2 | `02-search.png` | Search thousands of saved tabs instantly | Search results across collections, with the path to each hit |
| 3 | `03-restore-points.png` | Restore points, so nothing is ever final | The feature nobody else offers free |
| 4 | `04-undo-bin.png` | A 30-day undo bin for deleted collections | Deletion is reversible |
| 5 | `05-popup.png` | One click. Every tab, safely stowed. | The two-second core loop, with live counts on the button |
| 6 | `06-privacy.png` | Seven permissions. No access to any website. | The permission table, in the product itself |
| 7 | `07-dark.png` | A real dark mode, and full keyboard control | Design quality and accessibility |
| 8 | `08-welcome.png` | Set up in fifteen seconds | No friction on first run |

**Ordering logic.** The store shows the first screenshot largest and users often see only the first two. So: the product's main screen first, the thing it does that others cannot second. Trust features third and fourth, because they are the reason to switch. The popup fifth, once the reader is interested in *how*. Privacy sixth for the sceptic. Polish and onboarding last.

**Caption design.** A numbered chip, a bold headline making one claim, and a line of proof underneath, over a brand-tinted wash. The caption is the only text that survives a carousel thumbnail.

---

## 8. What reviewers will ask, and the answers

| Likely question | Prepared answer |
|---|---|
| Why `unlimitedStorage`? | `chrome.storage.local` caps at 10 MB. A user reaches that at roughly 25,000 saved tabs, after which writes fail. The extension exists to keep saved tabs safe, so silently failing to save is the one outcome that must not happen. |
| Why `favicon`? | To render site icons from Chrome's local cache. The alternative is a third-party favicon service, which would mean transmitting every saved URL off-device. This permission is what allows the extension to avoid that. |
| Why `tabs` rather than `activeTab`? | `activeTab` only grants access to the tab the user just interacted with, and only transiently. The core feature is saving *all* tabs in a window, so it cannot work. |
| Why `alarms`? | Two housekeeping jobs: sweeping the 30-day undo bin and checking whether a backup reminder is due. MV3 terminates the service worker when idle, so timers do not survive. |
| Is any data transmitted? | No. There is no `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, or `sendBeacon` anywhere in the source, and `tools/validate.py` fails the build if one appears. |
| Is the code obfuscated? | No. Plain ES modules, no bundler, no minifier. The published source matches the package byte for byte. |
| Does it reference another product? | Only as a factual statement of import compatibility, with an explicit non-affiliation notice at the end of the description. |
