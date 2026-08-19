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

**Tick exactly one: Web history.** Leave the other eight unticked.

| Category | Answer |
|---|---|
| **Web history** | **YES — tick this one** |
| Personally identifiable information | No |
| Health information | No |
| Financial and payment information | No |
| Authentication information | No |
| Personal communications | No |
| Location | No |
| User activity | No |
| Website content | No |

### Why Web history is ticked even though nothing is transmitted

Tabcove stores the web address, page title, and save time of every tab the user
chooses to save. That matches the Web history category, which is defined as the
list of pages a user has visited plus associated data such as page title and
time of visit.

Local-only storage does **not** exempt you. From Google's Chrome Web Store
[User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq):

> **Does an extension need to disclose user data handling if the data is only
> processed or stored locally on a user's device?**
>
> **Yes.** Extensions are required to disclose how they handle user data, even
> when data is processed or stored locally on a user's device and is not
> transmitted to external servers or third parties.

The same FAQ defines *handle* as "collecting, transmitting, using, or sharing
user data".

> **Do not argue that local storage is not collection.** That argument is
> specifically foreclosed by the FAQ above — and the store listing itself openly
> describes storing tab URLs, so under-declaring is an inconsistency a reviewer
> can spot from the listing text alone.

### The bound that matters, if a reviewer asks

Only tabs the user **explicitly chooses to save**. Tabcove does not request the
`history` permission and cannot read `chrome.history`. With no content scripts,
no host permissions, and no `webNavigation`, it cannot observe navigation or
read any page. It records nothing about pages the user did not ask it to save.

Full wording, and why the other eight are No: [`Data-Usage-Declarations.txt`](Data-Usage-Declarations.txt)

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
- [ ] **Web history ticked** — and only Web history; the other eight left unticked
- [ ] All three certification boxes ticked
- [ ] Privacy policy URL pasted, and it opens in a private window

---

## Reference copies kept in this folder

| File | What it is |
|---|---|
| [`Single-Purpose.txt`](Single-Purpose.txt) | The single purpose statement, plus the expanded form for a reviewer |
| [`Permissions-Justification.txt`](Permissions-Justification.txt) | The seven justifications as plain text |
| [`Data-Usage-Declarations.txt`](Data-Usage-Declarations.txt) | The nine categories and three certifications, with the reasoning for each |
| [`Privacy-Policy-URL.txt`](Privacy-Policy-URL.txt) | The URL, plus how to republish the policy |
| [`Reference/Privacy-Policy.md`](Reference/Privacy-Policy.md) | Offline copy of the published policy — answers no field, kept for reading without a network |
| [`Reference/Terms-of-Use.md`](Reference/Terms-of-Use.md) | Offline copy of the published terms — no dashboard field asks for terms |

Full policy reasoning, including what a reviewer is likely to ask and the
prepared answers: [`../../docs/compliance.md`](../../docs/compliance.md)
