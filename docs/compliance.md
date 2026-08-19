# Chrome Web Store Compliance — Tabcove

**Version:** 1.0.0
**Date:** 19 August 2026
**Audit result:** PASS — `python tools/validate.py` reports 0 errors across 157 checks
**Reviewed against:** Chrome Web Store Program Policies, Developer Program Policies, the User Data Policy (including Limited Use), Manifest V3 requirements, and the Chrome Web Store Branding Guidelines.

---

## 1. Single purpose

> **Tabcove saves your open browser tabs into a searchable local library and restores them.**

Every feature serves that sentence:

| Feature | How it serves the single purpose |
|---|---|
| Stow (all / one / others / selected / all windows) | Saving tabs |
| Library, search, tags, sort | Finding a saved tab again |
| Restore (collection, subset, single tab) | Restoring tabs |
| Tab groups, pinned state, window layout | Restoring tabs *faithfully* |
| Restore points, undo bin, undo toasts | Ensuring saved tabs remain restorable |
| Export / import | Ensuring saved tabs remain restorable outside the extension |
| Duplicate finder | Keeping the library usable at scale |
| Themes, density, keyboard support | The interface for the above |

Nothing is bundled that would broaden the purpose: no new-tab override, no search hijacking, no bookmark syncing, no reading mode, no ad blocking, no coupons, no affiliate links, no telemetry.

**Statement for the listing's single-purpose field:**

> Tabcove saves the tabs you have open into a local, searchable library, and restores them later with their tab groups, pinned state, and window layout intact. All data stays on the user's device.

---

## 2. Permission justification

Seven permissions. No host permissions. This table is written to be pasted directly into the Web Store's permission-justification fields.

| Permission | Justification (as submitted) |
|---|---|
| `tabs` | Required to read the title and URL of the user's open tabs so they can be saved, and to close them after they are saved. Without it, `chrome.tabs.query` returns tabs with no `url` or `title`, so a saved tab would be an empty entry. Also used to reopen saved tabs. |
| `tabGroups` | Required to read the name, colour, and collapsed state of Chrome tab groups when saving, and to re-create them when restoring. This is what allows a restored collection to keep its original group structure rather than becoming a flat list. |
| `storage` | Required to store the user's saved tab collections, settings, restore points, and undo bin on their own device. |
| `unlimitedStorage` | Required because `chrome.storage.local` is capped at 10 MB without it. A user with a large library reaches that cap at roughly 25,000 saved tabs, at which point writes begin to fail. Since this extension exists to keep saved tabs safe, silently failing to save is the one outcome that must not happen. |
| `contextMenus` | Required to add the right-click menu items "Stow all tabs in this window", "Stow just this tab", "Stow every other tab", and "Open Tabcove library". |
| `favicon` | Required to display site icons next to saved tabs, read from Chrome's **local** favicon cache via the `_favicon/` endpoint. This permission is specifically what allows the extension to avoid contacting a third-party favicon service, which would otherwise mean transmitting every saved URL to a remote server. |
| `alarms` | Required to run two periodic housekeeping tasks: sweeping items older than 30 days out of the undo bin, and checking whether the library has grown enough since the last export to warrant a backup reminder. Manifest V3 terminates the service worker when idle, so `setTimeout`/`setInterval` cannot be used. |

### Deliberately not requested

| Not requested | Why it was considered, and rejected |
|---|---|
| `host_permissions` / `<all_urls>` | Never needed. The extension does not read page content. Requesting it would produce the "Read and change all your data on all websites" warning — the single largest deterrent on the install dialogue. |
| `content_scripts` | Never needed. Nothing is injected into any page. |
| `scripting` | Never needed, for the same reason. |
| `downloads` | Export uses a blob URL and an `<a download>` element from an extension page, which requires no permission. Verified working. |
| `bookmarks` | Considered for import. Rejected: the same result is achievable by exporting bookmarks to HTML and pasting into the import box, which does not require read/write access to the entire bookmark tree. |
| `history` | Considered for a "recently closed" feature. Rejected: browsing history is highly sensitive and the feature is not core to the single purpose. |
| `notifications` | Considered for the backup reminder. Rejected: a toolbar badge conveys the same information without a permission or an interruption. |
| `identity` | Not needed — there is no account. Will be requested as an **optional** permission if and when Pro sync ships, at the moment of activation. |
| `sessions` | Considered for restoring closed windows. Rejected as out of scope for v1. |

---

## 3. User data policy

### 3.1 Data collection declaration

Tabcove collects **none** of the categories the Web Store asks about:

| Category | Collected? |
|---|---|
| Personally identifiable information | **No** |
| Health information | **No** |
| Financial and payment information | **No** |
| Authentication information | **No** |
| Personal communications | **No** |
| Location | **No** |
| Web history | **No** |
| User activity | **No** |
| Website content | **No** |

**Note on "web history":** Tabcove stores the URLs of tabs the user *explicitly chooses to save*. This is user-initiated local storage, not collection of browsing history: the extension never reads `chrome.history`, never observes navigation, and never transmits anything. Nothing is *collected* in the policy's sense — no data ever leaves the device.

### 3.2 Required certifications

| Certification | Answer |
|---|---|
| I do not sell or transfer user data to third parties, outside of the approved use cases | **Certified** — no data is transmitted anywhere at all |
| I do not use or transfer user data for purposes unrelated to my item's single purpose | **Certified** |
| I do not use or transfer user data to determine creditworthiness or for lending purposes | **Certified** |

### 3.3 Limited Use compliance

The Limited Use requirements are satisfied trivially, because there is no transmission path: no `fetch`, no `XMLHttpRequest`, no `WebSocket`, no `EventSource`, no `sendBeacon`, no remote script, no remote stylesheet, no remote font, no remote image. `tools/validate.py` scans every shipped file for each of those tokens and **fails the build** if one appears.

### 3.4 Privacy policy

Published at **https://owncoder.github.io/tabcove/privacy.html** and entered in the listing's Privacy tab. Source is version-controlled at `site/privacy.html`, so its full revision history is public.

---

## 4. Manifest V3 conformance

| Requirement | Status |
|---|---|
| `manifest_version: 3` | Yes |
| Service worker, not a background page | Yes — `background/service-worker.js`, `type: module` |
| No remotely-hosted code | Yes — every byte is in the package |
| No `eval`, `new Function`, or string-bodied timers | Yes — verified by `validate.py` |
| CSP declared and restrictive | `script-src 'self'; object-src 'self'; base-uri 'none'` |
| No `unsafe-eval` or `unsafe-inline` in CSP | Yes |
| Declarative `action`, not `browser_action`/`page_action` | Yes |
| `options_ui` rather than the deprecated `options_page` | Yes |
| `minimum_chrome_version` declared | Yes — `114`, the floor for `chrome.tabGroups` |
| No deprecated or preview APIs | Yes — `tabs`, `tabGroups`, `windows`, `storage`, `alarms`, `contextMenus` are all stable |

---

## 5. Content and behaviour policies

| Policy area | Status |
|---|---|
| **Deceptive behaviour** | The listing describes only what the extension does. No claims about AI, sync, or automation, because v1 has none. No inflated performance claims — the numbers quoted are measured and recorded in `testing-report.md`. |
| **Keyword spam** | The title is `Tabcove — Tab Manager & Session Saver`: a brand plus two accurate category terms. The description repeats key terms only where they read naturally. No hidden text, no competitor names stuffed for ranking. |
| **Impersonation & IP** | Original name, mark, colour, copy, layout, and code. No competitor's brand, icon, or trade dress is used. OneTab is named only as a factual statement of import compatibility — nominative fair use — and the listing states that Tabcove is not affiliated with it. |
| **Google branding** | The name contains no Google mark. The icon does not resemble Chrome's. The listing says "for Chrome", never "by Google", and does not imply endorsement. |
| **Minimum functionality** | Substantial: capture, search, restore, restore points, undo bin, import, export, duplicate detection. Not a wrapper around a website, and not a bookmark to one. |
| **Ads and monetisation** | None. No ads, no affiliate links, no sponsored content, no in-extension purchases in v1. |
| **Notifications and spam** | No notifications permission. One dismissible badge, at most, and only if the user leaves the backup reminder on. No rating prompts. No "what's new" tab on update. |
| **Security** | No remote code. No obfuscation or minification. Only `http`, `https`, `ftp`, and `file` URLs are stored or restored, so a `javascript:` URL cannot survive an import and be clicked. |
| **User controls** | Every behaviour is configurable, including whether tabs close on stow and whether restoring consumes a collection. "Delete everything" is available and offers an export first. |
| **Enterprise / affiliate policy** | Not applicable — nothing is monetised in v1. |

---

## 6. Accessibility

Not a Web Store requirement, but part of the product's quality bar and verified in [`testing-report.md`](testing-report.md): WCAG 2.1 Level AA contrast throughout, complete keyboard operation, correct roles and accessible names, live regions for status, `aria-setsize`/`aria-posinset` on virtualised rows, and support for `prefers-reduced-motion`, `prefers-contrast`, and `forced-colors`.

---

## 7. Automated self-audit

`tools/validate.py` turns the claims above into checks that fail the build. It is run by `tools/build.py` before any ZIP is produced, so a package cannot be created from a state that violates them.

| Check | What it enforces |
|---|---|
| `manifest` | Valid JSON, MV3, semantic version, name ≤ 75 chars, description ≤ 132 chars, `minimum_chrome_version` present, permission allowlist, absence of `host_permissions` / `content_scripts` / `web_accessible_resources` / `externally_connectable`, CSP pinned to `'self'` with no `unsafe-*` |
| `network` | No `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `importScripts`, remote `<script>`, remote `<link>`, remote `@import`, or remote CSS asset |
| `unsafe` | No `eval`, `new Function`, string-bodied `setTimeout`/`setInterval`, inline event-handler attributes, or `javascript:` URLs |
| `xss` | No assignment to `innerHTML` / `outerHTML`, and no `insertAdjacentHTML` |
| `assets` | Every icon, stylesheet, script, and ES-module import referenced anywhere actually exists |
| `size` | Unpacked size within budget |
| `contrast` | Every declared text colour pair meets WCAG 2.1 AA |

**Latest run:**

```
version           1.0.0
permissions       7
host permissions  0
unpacked size     298 KB
checks run        157
PASSED - ready to package
```

---

## 8. Submission answers, ready to paste

| Field | Value |
|---|---|
| **Category** | Productivity → Workflow & Planning |
| **Language** | English (United Kingdom) |
| **Single purpose** | Tabcove saves the tabs you have open into a local, searchable library, and restores them later with their tab groups, pinned state, and window layout intact. All data stays on the user's device. |
| **Privacy policy URL** | `https://owncoder.github.io/tabcove/privacy.html` |
| **Homepage URL** | `https://owncoder.github.io/tabcove/` |
| **Support URL** | `https://github.com/ownCoder/tabcove/issues` |
| **Data usage — collected** | None of the listed categories |
| **Data usage — certifications** | All three certified |
| **Contains ads** | No |
| **In-app purchases** | No |
| **Trader status** | Non-trader (free extension, no monetisation in v1) |

---

## 9. Ongoing compliance

| Trigger | Action |
|---|---|
| Any new permission | Update this document, the options-page permission table, the privacy policy, and the listing — before submitting |
| Any network call ever added | It must be Pro-only, opt-in, and behind an optional permission requested at activation; the privacy policy must be updated *before* the version ships |
| Policy update from Google | Re-run `tools/validate.py`, re-read this document, and re-audit the listing |
| Every release | `python tools/build.py` runs the full audit and refuses to package on any error |
