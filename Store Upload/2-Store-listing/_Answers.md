# 2 · Store listing — every field, in dashboard order

**Dashboard path:** Developer Dashboard → your item → **Store listing**

---

## 1 · Title

**Paste:** [`Text/Store-Title.txt`](Text/Store-Title.txt)

```
Tabcove — Tab Manager & Session Saver
```

37 of 75 characters.

---

## 2 · Summary

**Paste:** [`Text/Short-Description.txt`](Text/Short-Description.txt) — 129 of 132 characters.

---

## 3 · Description

**Paste:** [`Text/Long-Description.txt`](Text/Long-Description.txt)

Paste as **plain text**. The store strips formatting, and the copy is written for
that — headings are in caps because caps are the only heading device that
survives.

---

## 4 · Category

**Select:** `Productivity` → `Workflow & Planning`

---

## 5 · Language

**Select:** `English (United Kingdom)`

Matches `_locales/en/messages.json` and the spelling throughout the listing
("colour", "organise").

---

## 6 · Store icon

Taken from the uploaded ZIP automatically — the 128 px icon in the manifest.

Spare, if the dashboard asks for one directly: [`Icons/icon-128.png`](Icons/icon-128.png)

---

## 7 · Screenshots — **the store accepts a maximum of 5**

**Upload all five from [`Screenshots/`](Screenshots/), in filename order.**

| # | File | What it argues |
|---|---|---|
| 1 | `01-library.png` | The core screen, with two coloured tab groups intact — the thing competitors flatten |
| 2 | `02-search.png` | Search across collections, with the path to each hit |
| 3 | `03-restore-points.png` | The differentiator nobody else offers free |
| 4 | `04-popup.png` | The two-second core loop, with live counts on the button |
| 5 | `05-privacy.png` | The permission table, inside the product |

`01-library.png` **must be first** — it is displayed largest and is often the
only one seen.

### Three more exist, and are deliberately not uploaded

[`Extras/`](Extras/) holds `06-undo-bin.png`, `07-dark.png`, and
`08-welcome.png`. They are good screenshots; the store simply has five slots.

They are kept because the cut is a judgement, not a deletion — swap one in if the
listing underperforms, and use them for Product Hunt, the site, and any future
Edge or Firefox listing.

**Why these three were cut.** The undo bin makes the same durability argument as
restore points, which is already at #3. Dark mode and onboarding are polish
arguments, and polish does not convert someone whose actual fear is losing their
tabs.

---

## 8 · Small promo tile

**Upload:** [`Promo/promo-small-440x280.png`](Promo/promo-small-440x280.png) — 440 × 280

---

## 9 · Marquee promo tile

**Upload:** [`Promo/promo-marquee-1400x560.png`](Promo/promo-marquee-1400x560.png) — 1400 × 560

Optional, but required to be *eligible* for store featuring. Upload it.

---

## 10 · Official URL / Homepage URL

```
https://owncoder.github.io/tabcove/
```

> **Reviewers open this.** Confirm it loads before submitting. Its call-to-action
> button must not point at an item that does not exist yet — the page currently
> links to the GitHub repository and says the store listing is pending review.
> Swap it to the store URL only after approval.

---

## 11 · Support URL

```
https://github.com/ownCoder/tabcove/issues
```

Issues must be **enabled** on the repository. Check in a private window.

---

## 12 · Video

**Field:** "Video" (optional, a YouTube URL)

**Leave blank.** There is no video for v1.0.0. Short-form video is planned in
`docs/growth-plan.md` §7 for weeks 5–8, after launch. Add one later — a listing
video lifts install rate, but a rushed one lowers it.

---

## 13 · Mature content

**Select:** `No`

---

## Before you leave this surface

- [ ] Title, Summary, Description pasted
- [ ] Category: Productivity → Workflow & Planning
- [ ] Language: English (United Kingdom)
- [ ] **5** screenshots uploaded, `01-library.png` first
- [ ] Small promo tile uploaded
- [ ] Marquee promo tile uploaded
- [ ] Official URL set, and it loads
- [ ] Support URL set, and issues are enabled
- [ ] Video left blank
- [ ] Mature content: No

Next: [`../3-Privacy/_Answers.md`](../3-Privacy/_Answers.md)
