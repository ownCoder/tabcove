# Terms of Use — where they live and what they commit us to

**Published URL:** **https://owncoder.github.io/tabcove/terms.html**

As with the privacy policy, this file is the map rather than the terms
themselves. The published page is authoritative; `site/terms.html` is what gets
edited; `Store Upload/Privacy/Terms-of-Use.md` is a plain-text copy kept with the
submission package.

---

## What the terms commit us to

Most of the document is standard: a free licence to use, no warranty, and a
limitation of liability. Three clauses are deliberate product decisions rather
than boilerplate, and they should not be softened without a real reason.

### 1. Free features stay free (§8)

> Every feature present in version 1.0.0 will remain available at no cost. If
> paid features are introduced in a future version, they will be additions — not
> the removal of anything you can use today.

This is a promise made in writing, in a legal document, on purpose. The two
clearest cautionary tales in this exact category are products whose ratings
collapsed after they moved existing capability behind a paywall or an account.
See [`free-vs-pro-plan.md`](free-vs-pro-plan.md) §1.

Breaking this clause would be both a reputational failure and a contradiction of
a published term.

### 2. Brand carve-out from the MIT licence (§3)

The source is MIT. **The name, the logo, and the icon set are not.** A fork must
ship under a different name and mark.

This is not developer-hostile; it is user-protective, and the reason is specific
to this category. A widely-installed tab-management extension was acquired by new
owners in 2020 and re-published under its original name with code that executed
arbitrary remote instructions. It was removed from the Chrome Web Store in
February 2021, by which point more than two million people had installed it with
no way to distinguish the trusted version from the malicious one.

Tying the name and the mark to a single publisher is what makes that distinction
possible. The same carve-out appears in `LICENSE`.

### 3. Data portability survives the product (§9)

> If Tabcove were ever withdrawn from the Chrome Web Store, your locally stored
> data would remain on your device and your exports would remain readable.

This is why the export formats are all open and self-describing, and why the HTML
export in particular is a self-contained page that opens in any browser with
nothing installed. It is a design constraint expressed as a term.

---

## How to update

1. Edit `site/terms.html`, changing the effective date.
2. Commit to `main`.
3. Republish the `gh-pages` branch.
4. Update `Store Upload/Privacy/Terms-of-Use.md` to match.
5. Verify: `curl -sI https://owncoder.github.io/tabcove/terms.html`

**Never weaken §8 or §3 without a written reason recorded in `CHANGELOG.md`.**
They are the two clauses users would notice, and the two that a competitor's
history shows actually matter.
