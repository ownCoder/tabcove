# Privacy tab — every answer, in dashboard order

**Extension:** Tabcove — Tab Manager & Session Saver 1.0.0
**Dashboard path:** Developer Dashboard → your item → **Privacy**

Work straight down this page. Every field on the Privacy tab is answered here, in
the order the dashboard presents them. Nothing on this tab requires you to open
another folder.

---

## 1 · Single purpose

**Field:** "Single purpose" → description box

**Paste:**

```
Tabcove saves the tabs you have open into a local, searchable library, and restores them later with their tab groups, pinned state, and window layout intact. All data stays on the user's device.
```

Longer form and the reviewer-facing elaboration: [`Single-Purpose.txt`](Single-Purpose.txt)

---

## 2 · Permission justifications

**Field:** one text box per permission the uploaded package requests.

The dashboard generates these boxes **after** the ZIP is uploaded, so upload the
package first or the fields will not be there. Tabcove requests seven
permissions and no host permissions, so you will see seven boxes.

> **Do not leave any box blank.** A missing justification is the single most
> common cause of rejection for an extension in this category.

### `tabs`

```
Required to read the title and URL of the user's open tabs so they can be saved, and to close them after they have been saved. Without this permission chrome.tabs.query returns tabs with no url or title, so a saved tab would be an empty entry. Also used to reopen saved tabs.
```

### `tabGroups`

```
Required to read the name, colour, and collapsed state of Chrome tab groups when saving, and to re-create them when restoring, so a restored collection keeps its original group structure instead of becoming a flat list.
```

### `storage`

```
Required to store the user's saved tab collections, settings, restore points, and undo bin on their own device.
```

### `unlimitedStorage`

```
Required because chrome.storage.local is capped at 10 MB without it. A user with a large library reaches that cap at roughly 25,000 saved tabs, after which writes begin to fail. This extension exists to keep saved tabs safe, so silently failing to save is the one outcome that must not happen.
```

### `contextMenus`

```
Required to add the right-click menu items "Stow all tabs in this window", "Stow just this tab", "Stow every other tab", and "Open Tabcove library".
```

### `favicon`

```
Required to display site icons next to saved tabs, read from Chrome's LOCAL favicon cache via the _favicon/ endpoint. This permission is specifically what allows the extension to avoid contacting a third-party favicon service, which would otherwise mean transmitting every saved URL to a remote server.
```

### `alarms`

```
Required for two periodic housekeeping tasks: sweeping items older than 30 days out of the undo bin, and checking whether the library has grown enough since the last export to warrant a backup reminder. Manifest V3 terminates the service worker when idle, so setTimeout and setInterval cannot be used.
```

### Host permission justification

**No box should appear.** Tabcove declares no `host_permissions` and no
`content_scripts`. If the dashboard does show a host-permission box, the wrong
package was uploaded — stop and re-run `python tools/build.py`.

Same file, standalone: [`Permissions-Justification.txt`](Permissions-Justification.txt)

---

## 3 · Remote code

**Field:** "Are you using remote code?"

**Select:** `No, I am not using remote code`

All logic is inside the uploaded package. There is no `eval`, no
`new Function`, no string-bodied timer, no remotely-hosted `<script>` or
stylesheet, and no `import()` of a remote URL. The content security policy pins
`script-src` to `'self'`.

If asked to substantiate: `python tools/validate.py` fails the build if any of
those appear, and the published source at
<https://github.com/ownCoder/tabcove> is neither minified nor obfuscated.

---

## 4 · Data usage — what you collect

**Field:** "What user data do you plan to collect from users now or in the
future?" — nine checkboxes.

**Tick none of them.** Every answer is No.

| Category | Answer |
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

**If a reviewer queries "Web history":** Tabcove stores the URLs of tabs the
user *explicitly chooses to save*. That is user-initiated local storage, not
collection of browsing history. The extension never reads `chrome.history`,
never observes navigation, and never transmits anything — no data leaves the
device, so nothing is *collected* in the policy's sense.

---

## 5 · Data usage — certifications

**Field:** three checkboxes. **Tick all three.**

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

All three are true trivially: the extension contains no networking code, so
there is no transmission path to misuse.

---

## 6 · Privacy policy URL

**Field:** "Privacy policy URL"

**Paste:**

```
https://owncoder.github.io/tabcove/privacy.html
```

Verified live 19 August 2026 (HTTP 200). Open it in a private window before
submitting — a privacy policy URL that does not resolve is grounds for removal.

Detail, and how to update it: [`Privacy-Policy-URL.txt`](Privacy-Policy-URL.txt)

---

## Before you leave this tab

- [ ] Single purpose written
- [ ] A justification pasted into **every** permission box — none blank
- [ ] Host-permission box did **not** appear
- [ ] "No, I am not using remote code" selected
- [ ] All nine data categories left unticked
- [ ] All three certification boxes ticked
- [ ] Privacy policy URL pasted, and it opens in a private window

---

## Reference copies kept in this folder

| File | What it is |
|---|---|
| [`Single-Purpose.txt`](Single-Purpose.txt) | The single purpose statement, plus the expanded form for a reviewer |
| [`Permissions-Justification.txt`](Permissions-Justification.txt) | The seven justifications as plain text |
| [`Data-Usage-Declarations.txt`](Data-Usage-Declarations.txt) | The nine categories and three certifications as plain text |
| [`Privacy-Policy-URL.txt`](Privacy-Policy-URL.txt) | The URL, plus how to republish the policy |
| [`Privacy-Policy.md`](Privacy-Policy.md) | Offline copy of the published policy |
| [`Terms-of-Use.md`](Terms-of-Use.md) | Offline copy of the published terms |

Full policy reasoning, including what a reviewer is likely to ask and the
prepared answers: [`../../docs/compliance.md`](../../docs/compliance.md)
