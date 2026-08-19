# Tabcove — Chrome Web Store Upload Guide

**Package version:** 1.0.0
**Prepared:** 19 August 2026
**Time needed:** about 15 minutes

Everything you need is in this folder, **filed by the dashboard tab that asks for
it**. Work top to bottom and do not open anything else.

> **The three tabs, and the one folder each needs:**
>
> | Dashboard tab | Open this folder |
> |---|---|
> | Store listing | `Store Assets/` |
> | **Privacy** | **`Privacy/` — start with `Privacy-Tab-Answers.md`** |
> | Distribution | `Store Assets/Text/Category-and-Metadata.txt` |

---

## What is in here

```
Store Upload/
├─ Extension.zip                     ← the package you upload
├─ Upload Guide.md                   ← this file
│
├─ Privacy/                          ── EVERYTHING THE PRIVACY TAB ASKS FOR ──
│   Privacy-Tab-Answers.md           ← START HERE for the Privacy tab.
│                                      Every field, in dashboard order.
│   Single-Purpose.txt                 field: Single purpose
│   Permissions-Justification.txt      field: one box per permission
│   Data-Usage-Declarations.txt        fields: 9 data categories + 3 certifications
│   Privacy-Policy-URL.txt             field: Privacy policy URL
│   Privacy-Policy.md                  offline copy of the published policy
│   Terms-of-Use.md                    offline copy of the published terms
│
└─ Store Assets/                     ── STORE LISTING + DISTRIBUTION TABS ──
   ├─ Text/
   │   Store-Title.txt                 field: Title
   │   Short-Description.txt            field: Summary
   │   Long-Description.txt             field: Description
   │   Category-and-Metadata.txt        every dropdown on Listing + Distribution
   │   Keywords.txt                     reference only — no field for it
   │   Promotional-Text.txt             reference for the tiles
   │   Release-Notes.txt                for the GitHub release, not the store
   ├─ Screenshots/                      field: Screenshots — 8 files, 1280×800
   │   01-library.png                   ← must be FIRST
   │   02-search.png  03-restore-points.png  04-undo-bin.png
   │   05-popup.png   06-privacy.png    07-dark.png  08-welcome.png
   ├─ Promo/
   │   promo-small-440x280.png          field: Small promo tile
   │   promo-marquee-1400x560.png       field: Marquee promo tile
   ├─ Icons/
   │   icon-16.png  icon-32.png  icon-48.png  icon-128.png
   └─ manifest-reference.json           a copy of what is inside the ZIP
```

---

## Field-to-asset map

### Package

| Dashboard field | Asset |
|---|---|
| **Upload new package** | `Extension.zip` |

### Store listing tab

| Dashboard field | Asset |
|---|---|
| Title | `Store Assets/Text/Store-Title.txt` |
| Summary | `Store Assets/Text/Short-Description.txt` |
| Description | `Store Assets/Text/Long-Description.txt` |
| Category | Productivity → Workflow & Planning |
| Language | English (United Kingdom) |
| Store icon | Taken from the ZIP automatically (128 px). Spare: `Store Assets/Icons/icon-128.png` |
| Screenshots | All 8 from `Store Assets/Screenshots/`, in filename order |
| Small promo tile | `Store Assets/Promo/promo-small-440x280.png` |
| Marquee promo tile | `Store Assets/Promo/promo-marquee-1400x560.png` |
| Official URL / Homepage | `https://owncoder.github.io/tabcove/` |
| Support URL | `https://github.com/ownCoder/tabcove/issues` |
| Mature content | No |

### Privacy tab

**Every field on this tab is answered in [`Privacy/Privacy-Tab-Answers.md`](Privacy/Privacy-Tab-Answers.md), in dashboard order.** Individual files if you prefer them separately:

| Dashboard field | Asset |
|---|---|
| **Single purpose** | **`Privacy/Single-Purpose.txt`** |
| Permission justification — one box per permission | `Privacy/Permissions-Justification.txt` |
| Host permission justification | *No box should appear — Tabcove declares none* |
| Are you using remote code? | **No** — see `Privacy/Privacy-Tab-Answers.md` §3 |
| Data usage — 9 category checkboxes | `Privacy/Data-Usage-Declarations.txt` — tick **none** |
| Data usage — 3 certification checkboxes | `Privacy/Data-Usage-Declarations.txt` — tick **all three** |
| Privacy policy URL | `Privacy/Privacy-Policy-URL.txt` |

### Distribution tab

| Dashboard field | Asset |
|---|---|
| Visibility | Public |
| Pricing | Free |
| Regions | All |
| Trader status | Non-trader — see `Store Assets/Text/Category-and-Metadata.txt` |

---

## Upload order

Do it in this order. The dashboard will not let you submit until the Privacy tab
is complete, and **the permission justification boxes only appear after the
package is uploaded** — so the package goes first.

### 1 — Upload the package

Developer Dashboard → **Items** → **Add new item** → drag in `Extension.zip`.

Wait for the upload to finish. The dashboard will show
`Tabcove — Tab Manager & Session Saver`, version `1.0.0`, and will list the seven
permissions it found.

> **Check now:** the permission list should read exactly
> `tabs`, `tabGroups`, `storage`, `unlimitedStorage`, `contextMenus`, `favicon`, `alarms`
> and there must be **no host permissions**. If anything else appears, stop and
> re-run `python tools/build.py`.

### 2 — Store listing tab

1. **Title** — paste `Store Assets/Text/Store-Title.txt`.
2. **Summary** — paste `Store Assets/Text/Short-Description.txt`.
3. **Description** — paste `Store Assets/Text/Long-Description.txt`. Paste as plain text; the store strips formatting and the copy is already written for that.
4. **Category** — Productivity, then Workflow & Planning.
5. **Language** — English (United Kingdom).
6. **Screenshots** — upload all eight, in filename order. `01-library.png` must be first: it is the one shown largest.
7. **Small promo tile** — `promo-small-440x280.png`.
8. **Marquee promo tile** — `promo-marquee-1400x560.png`.
9. **Official URL** — `https://owncoder.github.io/tabcove/`
10. **Support URL** — `https://github.com/ownCoder/tabcove/issues`

Save the draft.

### 3 — Privacy tab

**Open [`Privacy/Privacy-Tab-Answers.md`](Privacy/Privacy-Tab-Answers.md) and work
straight down it.** It covers all six things this tab asks for, in the order the
dashboard presents them:

1. **Single purpose** — the paste-ready sentence is §1.
2. **Permission justifications** — §2 has one block per permission. **Do not leave any box blank**; a missing justification is the single most common cause of rejection here.
3. **Remote code** — §3. Select *No, I am not using remote code*.
4. **Data usage** — §4. Tick **nothing**; every category is No.
5. **Certifications** — §5. Tick **all three**.
6. **Privacy policy URL** — §6. `https://owncoder.github.io/tabcove/privacy.html`

Save the draft.

### 4 — Distribution tab

- Visibility: **Public**
- Pricing: **Free**
- Regions: **All**
- Trader status: **Non-trader** (nothing is monetised in this version)

Save the draft.

### 5 — Submit

**Preview** first, read the listing as a user would, then **Submit for review**.

Typical review time for a first submission with seven low-risk permissions and no
host permissions is 1–5 business days.

---

## Version verification

Before you press submit, confirm all four agree on `1.0.0`:

| Where | How to check |
|---|---|
| Inside the ZIP | `Store Assets/manifest-reference.json` → `"version": "1.0.0"` |
| Dashboard header | Shown after the package upload |
| `CHANGELOG.md` | Top entry is `## [1.0.0] — 2026-08-19` |
| Git tag | `git tag -l v1.0.0` in the repository |

If any disagree, fix the source and re-run `python tools/build.py`. Do not edit
the ZIP.

---

## Permission review — what to expect

Two of the seven may draw a question. Both answers are already written in
`Privacy/Permissions-Justification.txt`; this is the short version if a reviewer
asks directly.

| Permission | If asked |
|---|---|
| `unlimitedStorage` | `chrome.storage.local` caps at 10 MB, which a heavy user reaches at roughly 25,000 saved tabs, after which writes silently fail. An extension whose purpose is keeping saved tabs safe cannot fail to save. |
| `favicon` | It renders site icons from Chrome's **local** cache. The alternative is a third-party favicon service, which would mean transmitting every saved URL off-device. This permission exists specifically to avoid that. |

A third question sometimes comes up on the data-usage answers:

| Question | If asked |
|---|---|
| "You store URLs — isn't that web history?" | Tabcove stores URLs the user *explicitly chose to save*, in local storage on their own device. It never reads `chrome.history`, never observes navigation, and never transmits anything. Full wording in `Privacy/Data-Usage-Declarations.txt` §3. |

There are no host permissions, no content scripts, and no remote code, so the
usual sources of delay do not apply.

---

## Final publish checklist

Tick every line before submitting.

**Package**
- [ ] `Extension.zip` uploaded and accepted
- [ ] Version reads `1.0.0`
- [ ] Exactly seven permissions listed, and no host permissions
- [ ] `python tools/build.py` last run with **PASSED**

**Store listing tab**
- [ ] Title, Summary, and Description pasted
- [ ] Category set to Productivity → Workflow & Planning
- [ ] All 8 screenshots uploaded, `01-library.png` first
- [ ] Both promo tiles uploaded
- [ ] Homepage and Support URLs set

**Privacy tab**
- [ ] **Single purpose written** (`Privacy/Single-Purpose.txt`)
- [ ] A justification pasted into **every** permission box — none blank
- [ ] No host-permission box appeared
- [ ] "No, I am not using remote code" selected
- [ ] All nine data categories left unticked
- [ ] All three certification boxes ticked
- [ ] Privacy policy URL pasted, and it opens in a fresh private window

**Distribution tab**
- [ ] Public, Free, All regions, Non-trader

**Sanity**
- [ ] `https://owncoder.github.io/tabcove/privacy.html` returns the policy in a private window
- [ ] `https://github.com/ownCoder/tabcove/issues` is reachable and issues are enabled
- [ ] The ZIP has been loaded once as an unpacked extension without console errors

---

## After it is approved

1. **Add the store URL** to `site/index.html` (replace the placeholder Chrome Web Store link on the hero button), commit, and republish the `gh-pages` branch.
2. **Tag the release**: `git tag -a v1.0.0 -m "Tabcove 1.0.0"` and `git push --tags`.
3. **Create the GitHub release**, using `Store Assets/Text/Release-Notes.txt` as the body and attaching `Extension.zip`.
4. **Start the growth plan** at `docs/growth-plan.md` — week 0 is the first 25 honest reviews, not a Product Hunt launch.
5. **Watch reviews daily for two weeks.** Reply to every one. Any report of lost data is a same-day hotfix, no exceptions.

---

## If something is rejected

| Rejection reason | What to do |
|---|---|
| Permission not justified | The justification exists in `Privacy/Permissions-Justification.txt`. Paste it into the specific field the reviewer names and resubmit. |
| Single purpose unclear | Use the paragraph in `Privacy/Single-Purpose.txt` verbatim; it is written to match the policy's wording. The same file carries an expanded form if the reviewer wants more. |
| Data usage disputed | `Privacy/Data-Usage-Declarations.txt` §3 and §4 carry the prepared answers for the "web history" and "user activity" questions. |
| Privacy policy inaccessible | Confirm the URL loads in a private window. If GitHub Pages is rebuilding, wait and resubmit. |
| Metadata / keyword spam | Not expected — the title carries a brand plus two accurate category terms. If challenged, remove `& Session Saver` from the title and resubmit. |
| Anything else | Read the exact policy clause quoted, fix the cause rather than the symptom, then re-run `python tools/build.py` and resubmit. |
