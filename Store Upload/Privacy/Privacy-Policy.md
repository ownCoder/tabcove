# Privacy Policy — Tabcove

**Effective date:** 19 August 2026
**Last updated:** 19 August 2026
**Applies to:** Tabcove — Tab Manager & Session Saver, all versions
**Published at:** https://owncoder.github.io/tabcove/privacy.html

> This file is a plain-text copy of the published policy, kept in the submission
> package for reference. The authoritative version is the published URL above.

---

## The short version

Tabcove does not collect, transmit, sell, or share any personal information.
There is no account, no sign-in, no analytics, and no networking code anywhere in
the extension. Everything you save stays in your own browser, on your own device,
and only you can see it.

---

## 1. Who this policy is from

Tabcove is an independent Chrome extension published by **ownCoder**. Questions
can be raised at https://github.com/ownCoder/tabcove/issues, which is the support
channel for the extension.

## 2. What we collect

**Nothing.** Specifically, Tabcove does not collect:

- Personally identifiable information — name, address, e-mail, age, or ID number
- Health information
- Financial or payment information
- Authentication information — passwords, credentials, security questions, PINs
- Personal communications — e-mails, texts, or chat messages
- Location — IP-derived, GPS, or otherwise
- Web history
- User activity — clicks, mouse position, scroll, or keystroke logging
- Website content — text, images, sound, video, or hyperlinks from pages you visit

These are the exact categories the Chrome Web Store asks developers to declare.
Tabcove's answer to every one of them is "no".

## 3. What Tabcove stores, and where

Tabcove's purpose is to save your tabs, so it necessarily stores information
about them. That information never leaves your computer.

| What is stored | Where | Who can read it |
|---|---|---|
| Titles and addresses of tabs you choose to save | `chrome.storage.local`, in your browser profile | Only you |
| Tab group names and colours, pinned state, window arrangement | `chrome.storage.local` | Only you |
| Collection names, tags, notes, timestamps you create | `chrome.storage.local` | Only you |
| Restore points and items in the undo bin | `chrome.storage.local` | Only you |
| Your settings and the date of your last export | `chrome.storage.local` | Only you |

**Nothing is stored on any server, because there is no server.** Tabcove has no
backend, no database, and no hosting of any kind. Uninstalling the extension
causes Chrome to delete this data with it — which is why Tabcove asks you to keep
a backup and gives you one-click export in five formats.

## 4. What Tabcove transmits

**Nothing.** This is a property of the code, not a statement of intent:

- The extension declares **no host permissions** and **no content scripts**, so
  it cannot read or modify any web page.
- The source contains no `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`,
  or `navigator.sendBeacon`. The build script fails if any of them appears.
- There are no third-party scripts, advertising SDKs, analytics libraries, crash
  reporters, remote fonts, or remotely-hosted images.
- Site icons are read from Chrome's own **local** favicon cache. Tabcove
  deliberately does not use a remote favicon service, because that would mean
  sending your saved addresses to somebody else's server.

The source is public at https://github.com/ownCoder/tabcove and is neither
minified nor obfuscated — what you read is exactly what runs.

## 5. Permissions, and why each one exists

| Permission | Why |
|---|---|
| `tabs` | Read the title and address of your open tabs so they can be saved, and close them when you ask |
| `tabGroups` | Read and re-create Chrome tab groups so a restored collection keeps each group's name and colour |
| `storage` | Keep your library on your device |
| `unlimitedStorage` | Lift Chrome's 10 MB extension cap so a large library keeps working rather than silently failing to save |
| `contextMenus` | Add the right-click "Stow" actions |
| `favicon` | Show site icons from Chrome's **local** cache, so no remote favicon service ever sees your addresses |
| `alarms` | Sweep expired items from the undo bin and check whether a backup is due. Chrome shuts extensions down when idle, so an ordinary timer would not survive |

## 6. Third-party services

**None.** Tabcove uses no third-party services, libraries, SDKs, APIs, CDNs, or
fonts at runtime, and has no runtime dependencies at all.

Two third parties are involved in distribution rather than in the running
software: **Google**, which distributes the extension through the Chrome Web
Store, and **GitHub**, which hosts the source, the issue tracker, and the
published policy page. Their own privacy policies apply to what they do.

## 7. Data you export

Exports are generated in your browser and saved through Chrome's normal download
flow. Nothing is uploaded. Once the file is on your disk it is entirely yours —
be aware that it contains the titles and addresses of everything you have saved,
so treat it as you would any personal document.

## 8. Children

Tabcove is a general-purpose productivity tool and is not directed at children
under 13. Because it collects no data at all, it collects no data from children.

## 9. Your rights

The GDPR, the CCPA, and similar regulations grant rights to access, correct,
port, and delete personal data held about you. We hold none. In practice:

- **Access and portability** — export your library at any time, in five formats.
- **Correction** — edit or rename anything in the library at any time.
- **Erasure** — delete collections, empty the undo bin, use "Delete everything"
  in Settings, or uninstall the extension, which removes all of its data.

No request to us is required, because your data was never sent to us.

## 10. Security

Your library is protected by your browser profile and your operating system's
account security. Tabcove adds no network attack surface because it makes no
network requests. It executes no remote code: its content security policy pins
scripts to the extension's own package and it uses no `eval`. Data from web pages
— such as page titles — only ever enters the interface as text, never as markup.

Because everything is local, anyone with access to your computer and browser
profile can read your saved tabs. Protect your device accordingly.

## 11. Future paid features

A future version may offer optional paid features, including encrypted cloud
sync. If that happens, this policy will be updated **before** those features
ship; anything involving a network will be strictly opt-in with its permission
requested at the moment you enable it; and everything Tabcove does today will
remain free, local, and account-free.

## 12. Changes to this policy

Material changes will update the effective date above, and the full revision
history of the published page is public in the project repository. Continuing to
use Tabcove after a change means you accept the updated policy.

## 13. Contact

https://github.com/ownCoder/tabcove/issues — please do not include personal
information in a public issue.

---

## Chrome Web Store declaration

Tabcove's listing declares that it does not collect or use user data, does not
sell or transfer user data to third parties, does not use or transfer user data
for purposes unrelated to its single purpose, and does not use or transfer user
data to determine creditworthiness or for lending purposes. Those declarations
match the behaviour described here and the code that implements it.
