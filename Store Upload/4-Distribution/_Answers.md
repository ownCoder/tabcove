# 4 · Distribution — visibility, pricing, and regions

**Dashboard path:** Developer Dashboard → your item → **Distribution**

Every field on this surface, in dashboard order.

---

## 1 · Visibility

**Field:** "Visibility"

**Select:** `Public`

| Option | Use it when |
|---|---|
| **Public** ← | Anyone can find and install it. This is the launch setting. |
| Unlisted | Only people with the direct link. Useful for a beta, not for launch. |
| Private | Only named testers or a Google Workspace domain. |

---

## 2 · Pricing

**Field:** "Pricing"

**Select:** `Free`

Tabcove takes no money in any form: no payment, no subscription, no in-app
purchase, no advertising, no affiliate link, no sponsorship.

This is a commitment, not just a v1 state — see
[`../3-Privacy/Reference/Terms-of-Use.md`](../3-Privacy/Reference/Terms-of-Use.md)
§8, which states in writing that every feature present in 1.0.0 stays free.

---

## 3 · Contains ads

**Field:** "Does this item contain ads?"

**Select:** `No`

There is no advertising, no sponsored content, no affiliate link, and no promoted
placement anywhere in the extension or the listing.

---

## 4 · In-app purchases

**Field:** "Does this item offer in-app purchases?"

**Select:** `No`

v1.0.0 has no purchase path of any kind. There is no payment provider, no licence
purchase flow, and no checkout.

> **A reviewer may notice** that `extension/lib/license.js` contains an
> `activate(key)` function. It is a licence *seam* for a future version and it
> declines every key it is given, with the message "Tabcove Pro is not available
> yet. Everything in Tabcove today is free." There is no way to buy a key,
> because nothing sells one. See
> [`../1-Package/_Answers.md`](../1-Package/_Answers.md) § "What a reviewer will
> find in the source" for the prepared answer.

**When Pro ships**, this answer changes to Yes, and the trader status on the
Account surface changes with it.

---

## 5 · Distribution regions

**Field:** "Regions"

**Select:** `All regions`

Tabcove has no region-specific behaviour, no geographic restriction, and no
content that would be unlawful in any market. It is English-only in v1, which
limits its usefulness outside English-speaking markets but is not a reason to
withhold it.

---

## 6 · Mature content

**Field:** "Does this item contain mature content?"

**Select:** `No`

---

## Not on this surface, despite appearances

| Looks like it belongs here | Actually lives on |
|---|---|
| **Trader status** | The **Account** surface, not Distribution. [`../0-Account/_Answers.md`](../0-Account/_Answers.md) §5 |
| Privacy policy URL | The **Privacy** surface. [`../3-Privacy/_Answers.md`](../3-Privacy/_Answers.md) §6 |

Trader status is called out because it was previously filed under this tab, and a
submitter who finished the Account page and moved on would never have gone back
for it.

---

## Before you leave this surface

- [ ] Visibility: **Public**
- [ ] Pricing: **Free**
- [ ] Contains ads: **No**
- [ ] In-app purchases: **No**
- [ ] Regions: **All**
- [ ] Mature content: **No**

Next: submit. Return to [`../Upload Guide.md`](../Upload%20Guide.md) § "Submit".
