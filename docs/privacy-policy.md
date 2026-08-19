# Privacy Policy — where it lives and how to change it

**Published URL (the one in the store listing):**
**https://owncoder.github.io/tabcove/privacy.html**

This file is not the policy. It is the map, because a policy that exists in three
places will eventually say three different things — and the version a user reads
is the only one that matters.

---

## The three copies, and which one is authoritative

| Copy | Path | Role |
|---|---|---|
| **Published page** | `https://owncoder.github.io/tabcove/privacy.html` | **Authoritative.** This is the URL in the Chrome Web Store listing, in `manifest.json`'s `homepage_url` chain, and on the extension's options page. |
| Page source | `site/privacy.html` on `main` | What is edited. Deployed to the `gh-pages` branch. |
| Submission copy | `Store Upload/Privacy/Privacy-Policy.md` | A plain-text copy kept with the package so a reviewer, or future-you, can read it without a network. Marked in its own header as non-authoritative. |

---

## What the policy says, in one paragraph

Tabcove collects nothing, transmits nothing, and contains no networking code.
Saved tab titles and URLs, tab-group metadata, settings, restore points, and the
undo bin all live in `chrome.storage.local` on the user's own device. There is no
account, no server, and no third-party service at runtime. The extension declares
no host permissions and no content scripts, so it cannot read or modify any web
page. Site icons come from Chrome's local favicon cache rather than a remote
service, specifically so that saved URLs are never transmitted.

---

## Why the claims are verifiable rather than merely stated

`tools/validate.py` fails the build if any of the following appears anywhere in
`extension/`: `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`,
`navigator.sendBeacon`, `importScripts`, a remotely-hosted `<script>` or
`<link>`, a remote CSS `@import`, or a remote CSS asset URL. It also fails on any
`host_permissions`, `content_scripts`, or `web_accessible_resources` key in the
manifest.

That is what makes "no data is transmitted" a property of the build rather than a
promise in a document.

---

## How to update the policy

1. Edit `site/privacy.html`.
2. Change **both** the `Effective date` and the `Last updated` line at the top.
3. Commit to `main` — the revision history is public, which is the point.
4. Republish the site:

   ```bash
   git subtree push --prefix site origin gh-pages
   ```

   Or, if the branch has diverged, copy `site/` onto a fresh `gh-pages` branch
   and force-push it.
5. Confirm the change is live: `curl -sI https://owncoder.github.io/tabcove/privacy.html`
6. Update `Store Upload/Privacy/Privacy-Policy.md` to match.

**Do not change the URL.** It is recorded in the Chrome Web Store listing, on the
extension's options page, and in this repository's README. A dead privacy policy
URL is grounds for removal from the store.

---

## When the policy MUST be updated before shipping

| Change | Required update |
|---|---|
| Any new permission | Add it to the permissions table with a plain-English reason |
| Any network request, ever | Rewrite §4 *before* the version ships. This is the one that gets extensions removed. |
| Any third-party service or library at runtime | Add it to §6 |
| Cloud sync (planned for 2.0.0) | Full rewrite of §3, §4, §6, and §11 before release |
| A change in what is stored locally | Update the storage table in §3 |

The rule: **the policy changes before the code ships, not after.**
