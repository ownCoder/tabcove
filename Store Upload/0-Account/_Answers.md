# 0 · Account — before you can upload anything

**Dashboard path:** Developer Dashboard → **Account**

This surface exists because the Upload Guide used to begin at "Items → Add new
item", which silently assumed an account that had already cleared four gates. It
also had nowhere to put the **trader status** declaration, so that ended up filed
under the Distribution tab, where it does not belong.

> **You have already published two extensions**, so items 1–4 below are almost
> certainly done. Confirm them anyway — item 5 is the one that changes per item
> and is easy to get wrong.

---

## 1 · Developer registration fee

**Status:** one-off, per account, already paid if you have published before.

Nothing to do.

---

## 2 · Publisher display name

**Field:** Account → "Publisher display name"

**Value:** `ownCoder`

This is what appears under the extension's name in the store. It must match the
`author` field in `manifest.json` (`ownCoder`) or the listing reads as
inconsistent. Verify before submitting.

---

## 3 · Contact email — must be **verified**

**Field:** Account → "Contact email", plus the **Verify** button beside it.

An unverified contact email blocks publishing. This is the single most common
account-level stall, because the field can be *filled in* and still be
*unverified*, and the dashboard only complains at submit time.

Check that it shows **Verified**, not just populated.

---

## 4 · Two-Step Verification

Required on the Google account that owns the developer account. If it is not
enabled, publishing is blocked.

---

## 5 · Trader status (EU Digital Services Act)

**Field:** Account → "Trader status" → *Trader* / *Non-trader*

### Answer: **Non-trader**

```
Tabcove is published by an individual acting outside any trade, business, craft,
or profession. There is no company or registered business behind it, it is not
operated as a business, and it takes no revenue in any form — no payments, no
subscriptions, no in-app purchases, no advertising, no affiliate links, and no
sponsorship.
```

### The test is *not* monetisation

This matters, because the earlier version of this package justified "non-trader"
with "nothing is monetised in this version", which is the wrong test and would
not survive a challenge.

Under the DSA, a **trader** is a person acting *"for purposes relating to their
trade, business, craft or profession"*. Taking money is evidence of that, but the
absence of money is not proof of the opposite — publishing under a registered
business, or as part of professional activity, makes you a trader even at a price
of zero.

### When this answer must change

Re-declare as **Trader** if any of these becomes true:

| Trigger | Why |
|---|---|
| **Pro ships (v2.0.0)** | Taking payment is trading, unambiguously |
| You publish under a registered company or sole-trader name | The activity relates to a business |
| The extension becomes part of professional or freelance activity | Same test |
| You add advertising, sponsorship, or affiliate links | Revenue in another form |

**Be aware what declaring Trader costs:** legal name, contact address, and an
SMS-verified phone number, and Google **publishes those publicly** at the bottom
of your store listing. Decide before you monetise, not after.

> Cross-reference: `docs/free-vs-pro-plan.md` gates Pro behind 5,000 users, a 4.5
> rating, 100 reviews, and 35% week-4 retention. Add "re-declare trader status"
> to that gate.

---

## Before you leave this surface

- [ ] Developer registration fee paid
- [ ] Publisher display name is `ownCoder`, matching `manifest.json` → `author`
- [ ] Contact email shows **Verified**
- [ ] Two-Step Verification enabled on the Google account
- [ ] Trader status declared **Non-trader**, on the *correct* test

Next: [`../1-Package/_Answers.md`](../1-Package/_Answers.md)
