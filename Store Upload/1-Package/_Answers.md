# 1 · Package — the upload itself

**Dashboard path:** Developer Dashboard → **Items** → **Add new item**

---

## 1 · The ZIP

**Field:** the drag-and-drop upload box

**File:** [`../Extension.zip`](../Extension.zip) — 106 KB

Built by `python tools/build.py`, which refuses to produce it unless the policy
audit, the unit tests, the functional tests, and the submission-completeness
check all pass.

---

## 2 · Verify what the dashboard reports back

The moment the upload finishes, the dashboard shows what it found. Check all
four before touching any other tab.

| Reported | Must be |
|---|---|
| Name | `Tabcove — Tab Manager & Session Saver` |
| Version | `1.0.0` |
| Permissions | exactly `tabs`, `tabGroups`, `storage`, `unlimitedStorage`, `contextMenus`, `favicon`, `alarms` |
| Host permissions | **none — no box, no warning** |

If anything else appears, **stop**. Do not work around it in the listing. Re-run
`python tools/build.py` and upload the fresh ZIP.

Reference copy of what is inside: [`manifest-reference.json`](manifest-reference.json)

---

## 3 · What a reviewer will find in the source

The listing invites reviewers to read the code ("What you read is exactly what
runs"), and the source is not minified. Three things in it look like they
contradict the listing at a glance. Prepared answers:

### `lib/license.js` — a licence-key activation path in a free extension

It is a **seam**, not a feature. `activate()` accepts a key and declines every
one of them:

```
return {
  ok: false,
  reason: 'Tabcove Pro is not available yet. Everything in Tabcove today is free.',
};
```

There is no purchase flow, no payment provider, and no server to validate a key
against — the extension has no networking code at all. Its purpose is documented
in `docs/free-vs-pro-plan.md` §5: when Pro ships, only the body of `activate()`
changes, so a paid tier never requires re-architecting a product that two
thousand people already trust.

### `lib/flags.js` — a flag named `analytics`, in an extension that says "no analytics"

`FLAGS.analytics` describes a **planned Pro feature that shows the user their own
tab statistics, computed locally** — how often they reopen a collection, which
saved links are dead. It is not third-party analytics and not telemetry about the
user.

The name was ambiguous enough to read as a contradiction, so it has been renamed
**`tabInsights`**, and the file carries a comment saying why. There is no
tracking code, no analytics library, and no network call anywhere in the package.

### `_locales/en/messages.json`

The manifest declares `default_locale: "en"` and the extension resolves its name
and description through `chrome.i18n`, so this file is live rather than dead
payload. Localisation into further languages is planned for v1.4.0.

---

## 4 · Remote code

There is none, and this is the answer to give on the Privacy surface too.

- Every byte that executes is inside the ZIP.
- CSP: `script-src 'self'; object-src 'self'; base-uri 'none'`.
- No `eval`, no `new Function`, no string-bodied timers, no remote `<script>` or
  stylesheet, no dynamic `import()` of a URL.
- `python tools/validate.py` fails the build if any of those appear.

---

## Before you leave this surface

- [ ] `Extension.zip` uploaded and accepted
- [ ] Name reads `Tabcove — Tab Manager & Session Saver`
- [ ] Version reads `1.0.0`
- [ ] Exactly seven permissions listed
- [ ] **No** host permissions

Next: [`../2-Store-listing/_Answers.md`](../2-Store-listing/_Answers.md)
