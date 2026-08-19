# Tabcove — Chrome Web Store Upload Guide

**Package version:** 1.0.0
**Prepared:** 19 August 2026
**Time needed:** about 20 minutes, assuming the account gates in surface 0 are already cleared

---

## How this folder is organised

**One folder per dashboard surface, numbered in the order you work them.** Open
the folder, open its `_Answers.md`, and work down the page. Nothing sends you
hunting in another folder.

```
Store Upload/
├─ Upload Guide.md          ← you are here
├─ Extension.zip            ← the upload
│
├─ 0-Account/               Account page — gates everything else
│   _Answers.md               publisher name, verified email, 2SV, TRADER STATUS
│   fields.json
├─ 1-Package/               Items → Add new item
│   _Answers.md               what to verify the moment the upload lands
│   manifest-reference.json
│   fields.json
├─ 2-Store-listing/         Store listing tab
│   _Answers.md               every field, in dashboard order
│   Text/                     title, summary, description, metadata, keywords
│   Screenshots/              THE FIVE that get uploaded
│   Extras/                   three more, deliberately not uploaded
│   Promo/  Icons/
│   fields.json
├─ 3-Privacy/               Privacy tab
│   _Answers.md               every field, in dashboard order
│   Single-Purpose.txt
│   Permissions-Justification.txt
│   Data-Usage-Declarations.txt      ← tick Web history. Read the reason.
│   Privacy-Policy-URL.txt
│   Reference/                offline copies of the published policy and terms
│   fields.json
└─ 4-Distribution/          Distribution tab
    _Answers.md               visibility, pricing, ads, IAP, regions
    fields.json
```

Each `fields.json` enumerates every field that surface presents and names the
file answering it. `python tools/build.py` walks those manifests and **fails if
any field has no answer** — so a field the package has never heard of breaks the
build instead of being discovered at the dashboard.

---

## Order of work

| # | Surface | Open |
|---|---|---|
| 0 | **Account** | [`0-Account/_Answers.md`](0-Account/_Answers.md) |
| 1 | **Package** | [`1-Package/_Answers.md`](1-Package/_Answers.md) |
| 2 | **Store listing** | [`2-Store-listing/_Answers.md`](2-Store-listing/_Answers.md) |
| 3 | **Privacy** | [`3-Privacy/_Answers.md`](3-Privacy/_Answers.md) |
| 4 | **Distribution** | [`4-Distribution/_Answers.md`](4-Distribution/_Answers.md) |
| 5 | **Submit** | this file, below |

The order is not arbitrary. The account gates block the upload button; the
**permission-justification boxes on the Privacy tab do not exist until the
package is uploaded**; and the dashboard refuses to submit until Privacy is
complete.

---

## Three things that are easy to get wrong

### 1 · Tick **Web history** on the Privacy tab

The instinct is to tick nothing, because Tabcove transmits nothing. That is the
wrong answer, and Google says so directly:

> **Does an extension need to disclose user data handling if the data is only
> processed or stored locally on a user's device?**
>
> **Yes.** Extensions are required to disclose how they handle user data, even
> when data is processed or stored locally on a user's device and is not
> transmitted to external servers or third parties.
>
> — [Chrome Web Store User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)

Tabcove stores the URL, page title, and save time of saved tabs. That is the Web
history category. Tick it, leave the other eight, and tick all three
certifications. Full reasoning: [`3-Privacy/Data-Usage-Declarations.txt`](3-Privacy/Data-Usage-Declarations.txt)

### 2 · The store accepts a **maximum of five screenshots**

`2-Store-listing/Screenshots/` holds exactly five, already chosen and ordered.
Three more sit in `Extras/` and are **not** uploaded. Do not try to add them.

### 3 · **Trader status is on the Account page**, not Distribution

It is easy to finish the Account page early, never go back, and miss it. It is
also easy to justify "non-trader" with "nothing is monetised", which is the wrong
test. See [`0-Account/_Answers.md`](0-Account/_Answers.md) §5.

---

## Submit

Work surfaces 0 → 4, then:

1. **Preview** the listing and read it as a user would.
2. Decide how it publishes:

   | Option | Choose it when |
   |---|---|
   | **Publish immediately after review** ← recommended for v1.0.0 | You want it live the moment it clears |
   | Keep as draft after review | You are coordinating a launch date |

   > If you pick "keep as draft", **write down that you did.** An approved item
   > sitting unpublished looks identical to an item still in review, and there is
   > no notification that tells you the difference.

3. **Submit for review.**

Typical review time for a first submission with seven low-risk permissions and no
host permissions is 1–5 business days.

---

## Version verification

Before you press submit, confirm these agree on `1.0.0`:

| Where | How to check |
|---|---|
| Inside the ZIP | [`1-Package/manifest-reference.json`](1-Package/manifest-reference.json) → `"version": "1.0.0"` |
| Dashboard header | Shown after the package upload |
| `CHANGELOG.md` | Top entry is `## [1.0.0] — 2026-08-19` |

The git tag `v1.0.0` is created **after** approval, not before — see step 2 of
"After it is approved". Do not look for it now; it does not exist yet.

If the first three disagree, fix the source and re-run `python tools/build.py`.
Never edit the ZIP.

---

## Reviewer questions, and the prepared answers

Everything below is answerable without leaving this folder.

| Question | Answer lives in |
|---|---|
| Why `unlimitedStorage`? | [`3-Privacy/Permissions-Justification.txt`](3-Privacy/Permissions-Justification.txt) |
| Why `favicon`? | same |
| **Why `tabs` and not `activeTab`?** | same — `activeTab` grants transient access to one tab only, so "save every tab in this window" cannot work |
| "You store URLs — isn't that web history?" | Yes, and it is declared. [`3-Privacy/Data-Usage-Declarations.txt`](3-Privacy/Data-Usage-Declarations.txt) §2 |
| "Your listing names OneTab." | Factual import compatibility only — nominative fair use. The description ends with an explicit non-affiliation notice. |
| "There is a licence-activation function in a free extension." | [`1-Package/_Answers.md`](1-Package/_Answers.md) §3 |
| "There is a flag called analytics." | It is named `tabInsights`, and [`1-Package/_Answers.md`](1-Package/_Answers.md) §3 explains what it is |
| Is any code remote? | No. [`1-Package/_Answers.md`](1-Package/_Answers.md) §4 |

---

## Final publish checklist

**0 · Account**
- [ ] Publisher display name is `ownCoder`
- [ ] Contact email shows **Verified**
- [ ] Two-Step Verification enabled
- [ ] Trader status: **Non-trader**

**1 · Package**
- [ ] `Extension.zip` uploaded and accepted
- [ ] Name, version `1.0.0`, and **seven** permissions reported correctly
- [ ] **No** host permissions
- [ ] `python tools/build.py` last run with **PASSED**

**2 · Store listing**
- [ ] Title, Summary, Description pasted
- [ ] Category: Productivity → Workflow & Planning
- [ ] Language: English (United Kingdom)
- [ ] **Five** screenshots uploaded, `01-library.png` first
- [ ] Both promo tiles uploaded
- [ ] Official URL loads, and its call-to-action is not a dead link
- [ ] Support URL reachable, issues enabled
- [ ] Video left blank

**3 · Privacy**
- [ ] Single purpose written
- [ ] A justification in **every** permission box — none blank
- [ ] No host-permission box appeared
- [ ] "No, I am not using remote code" selected
- [ ] **Web history ticked** — and only Web history
- [ ] All three certification boxes ticked
- [ ] Privacy policy URL pasted, and it opens in a private window

**4 · Distribution**
- [ ] Public · Free · Contains ads: No · In-app purchases: No · All regions · Mature content: No

**Submit**
- [ ] Publishing choice made, and recorded if it is "keep as draft"

---

## After it is approved

1. **Update the site's call to action.** `site/index.html` currently links to the
   GitHub repository, because linking to a store item that does not exist yet is
   a dead link on the page reviewers open. Replace it with the store URL, commit,
   and republish `gh-pages`.
2. **Tag the release:** `git tag -a v1.0.0 -m "Tabcove 1.0.0"` and `git push --tags`.
3. **Create the GitHub release** using
   [`2-Store-listing/Text/Release-Notes.txt`](2-Store-listing/Text/Release-Notes.txt)
   as the body, attaching `Extension.zip`.
4. **Start `docs/growth-plan.md`** at the seeding stage — week 0 is the first 25
   honest reviews, not a Product Hunt launch.
5. **Watch reviews daily for two weeks.** Reply to every one. Any report of lost
   data is a same-day hotfix, no exceptions.

---

## If something is rejected

| Reason given | What to do |
|---|---|
| Permission not justified | The text is in `3-Privacy/Permissions-Justification.txt`. Paste it into the exact field named and resubmit. |
| Single purpose unclear | Use `3-Privacy/Single-Purpose.txt` verbatim; it carries an expanded form if more is wanted. |
| Data usage disputed | `3-Privacy/Data-Usage-Declarations.txt` §2 and §3 carry the prepared answers. |
| Privacy policy inaccessible | Load the URL in a private window. If GitHub Pages is rebuilding, wait and resubmit. |
| Metadata / keyword spam | Not expected — the title is a brand plus two accurate category terms. If challenged, drop `& Session Saver` and resubmit. |
| Anything else | Read the exact policy clause quoted, fix the cause rather than the symptom, re-run `python tools/build.py`, resubmit. |
