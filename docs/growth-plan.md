# Growth Plan — Tabcove

**Goal:** 5,000 organic users
**Budget:** £0
**Horizon:** 32 weeks
**Constraint:** one person, part-time

---

## 1. The strategy in one paragraph

The Chrome Web Store is a search engine, and the tab-manager category has high, evergreen, non-seasonal search volume. So the store *is* the funnel: everything else exists to feed store search rank and to supply the social proof that converts an impression into an install. There is one unusual asset here — an entire content niche ("my tab manager lost my tabs") already has search demand and no good answer, and Tabcove is both the answer *and* able to import from the product people are fleeing. That is the wedge.

**Sequencing principle:** get the listing right → earn the first 25 honest reviews → *then* spend attention on launches. A Product Hunt launch pointing at a listing with four reviews wastes the launch, and you only get one.

---

## 2. Funnel model

```
   store impression  ──►  listing view  ──►  install  ──►  week-1 retained  ──►  review
        100                    ~12%           ~8-14%          ~45%              ~2%
```

To reach 5,000 users at a 10% install rate, the listing needs roughly **50,000 impressions**, which needs either a top-20 rank on a head keyword or a steady trickle of referral traffic. Both are pursued.

| Lever | Effect | Cost |
|---|---|---|
| Store SEO | Impressions | Time, once |
| Screenshots + copy | Install rate | Time, once |
| Reviews | Install rate *and* rank | Ongoing attention |
| Off-store content | Referral installs + backlinks | Ongoing |

Improving the install rate from 8% to 14% is worth as much as a 75% increase in impressions, and is far cheaper. That is why the listing is polished before anything is promoted.

---

## 3. Chrome Web Store SEO

### 3.1 What the store actually ranks on

| Signal | Weight | Our position |
|---|---|---|
| Extension **name** | Very high | `Tabcove — Tab Manager & Session Saver` carries both head terms |
| **Short description** | High | Both head terms in the first 60 characters |
| **Detailed description** | Medium | Terms placed naturally, no stuffing |
| **Install count** | Very high | The flywheel we are building |
| **Rating and review count** | Very high | Priority one after launch |
| **Recency of update** | Medium | Ship a small update roughly monthly |
| **Uninstall rate** | Negative | Onboarding is designed around this |

### 3.2 Target keywords

| Tier | Term | Intent | Difficulty |
|---|---|---|---|
| Head | `tab manager` | Browsing the category | Very high |
| Head | `session saver` / `session manager` | Knows what they want | High |
| Body | `save tabs` | High intent | Medium |
| Body | `tab groups` | Feature-specific, high intent | Medium |
| Body | `restore tabs` | Recovery intent — **our best term** | Medium |
| Long tail | `save all tabs one click` | Very high intent | Low |
| Long tail | `tab manager no account` | Our exact positioning | Low |
| Long tail | `save chrome tab groups` | Underserved | Low |
| Long tail | `export chrome tabs` | Underserved | Low |

**Strategy:** win the long tail immediately, because those terms have few strong results and our listing matches them precisely. Head terms follow install count, which the long tail supplies.

### 3.3 Listing optimisation checklist

- [x] Title carries brand + two head keywords, 37/75 characters
- [x] Short description front-loads the action, 129/132 characters
- [x] Description opens with the single strongest sentence
- [x] 8 screenshots at 1280×800, each with a caption making one claim
- [x] Both promo tiles supplied — required to be eligible for featuring
- [x] Correct category: Productivity → Workflow & Planning
- [x] Privacy policy live, permissions justified — a stalled review is lost weeks

### 3.4 Update cadence

Ship a small release roughly monthly. Recency is a ranking signal, an updated listing surfaces to existing users, and it demonstrates the product is maintained — which is precisely the complaint levelled at the incumbent.

---

## 4. The rescue-content wedge

This is the highest-leverage, lowest-cost channel available, and it is specific to this category.

### 4.1 The insight

Search demand already exists for tab-manager data loss. There is a small industry of blog posts answering it, mostly published by competing products. Nobody answering it can *also* import the lost user's data — Tabcove can.

### 4.2 Execution

Publish on the GitHub Pages site (already live, already indexed) as a small `/guides/` section:

| Guide | Target query | Angle |
|---|---|---|
| How to get your tabs back after a tab manager loses them | "onetab lost my tabs", "restore lost tabs" | Genuinely useful recovery steps first, including ones that do not involve us. Tabcove appears only at the end, as prevention. |
| How to move your saved tabs to another tab manager | "export onetab", "migrate tab manager" | A neutral migration guide. Our import feature is the payoff. |
| How to save Chrome tab groups so they survive a restart | "save chrome tab groups" | The feature almost nobody has. |
| Why browser extensions lose your data, and what to do about it | "extension lost data", "chrome storage cleared" | The technical explainer. Establishes credibility, earns links. |
| Chrome using too much memory? Start with your tabs | "chrome too much memory" | Very high volume, adjacent intent. |

**Rules:** be genuinely useful before mentioning Tabcove; never disparage a competitor by name; never claim a competitor loses data — link to their own published guidance instead. Helpfulness converts; sniping does not, and it invites a trademark complaint.

**Realistic yield:** 5 guides × 30–150 organic visits/month each by month 6, at ~6% install rate → 60–200 installs/month, compounding, at zero marginal cost.

---

## 5. Reddit

The highest-conversion channel in this category, and the easiest to get wrong.

### 5.1 Where

| Subreddit | Fit | Approach |
|---|---|---|
| r/chrome | Direct | Participate for weeks first. Answer tab questions. |
| r/productivity | Good | Workflow framing, not a product post |
| r/GetStudying, r/PhD, r/GradSchool | Excellent — persona 1 | "How I stopped losing my research tabs" |
| r/webdev, r/programming | Good — persona 2 | The open-source, zero-permissions angle |
| r/privacy, r/degoogle | Excellent — persona 4 | No account, no network, auditable source |
| r/chrome_extensions, r/SideProject | Direct | Show-and-tell is welcome here |

### 5.2 Rules

1. **Participate for four weeks before posting anything of your own.** Answer questions where Tabcove is not the answer. Every subreddit above will remove a first-post promotion.
2. **Disclose authorship every time.** "I made this" converts better than pretending otherwise, and not disclosing gets you banned.
3. **Lead with the problem, not the product.**
4. **Never astroturf.** One fake account destroys the whole channel permanently.
5. **Reply to every critical comment** with a real answer. Handling criticism well converts lurkers better than the original post.

### 5.3 Best post angle

> **"I got tired of tab managers losing my tabs, so I built one that treats them like data"**
>
> Opens with the failure everybody in the thread has experienced. Explains the three durability mechanisms in plain terms. States the permission set. Links to the source. Asks what would make it better.

Expected: 200–800 installs from one well-received post in a large subreddit; more importantly, permanent search-indexed discussion.

---

## 6. Product Hunt

**One shot. Do not fire it early.**

### Gate

Launch only when: ≥ 25 store reviews, ≥ 4.6 rating, ≥ 300 users, and no open crash bug.

### Preparation (two weeks before)

- Comment usefully on other launches for two weeks — a cold account gets no distribution.
- Prepare: the marquee tile as the gallery image, a 40-second screen recording of the stow-then-search loop, the first comment already written.
- Line up 15–20 people who will genuinely try it. Never buy upvotes.

### On the day

- Launch Tuesday–Thursday, 00:01 PT.
- The maker comment leads with the durability story — that is what makes it a *story* and not another tab manager.
- Reply to every comment within the hour, all day.

**Realistic outcome:** top 10 of the day. 300–800 installs, a permanent backlink, and review credibility.

---

## 7. Short-form video

Highest ceiling, lowest cost, and this product happens to be unusually well suited to it: "close 100 tabs in one click" is a genuinely satisfying 12 seconds of footage.

### Format

| Beat | Seconds | Content |
|---|---|---|
| Hook | 0–2 | A screen recording of a tab strip with 90 tabs. "This is my browser." |
| Tension | 2–5 | "And I can't close any of them, because I'll never find them again." |
| Payoff | 5–9 | One click. The strip empties. The library appears. |
| Proof | 9–14 | Type three letters into search. The exact tab appears. |
| Reversal | 14–18 | Delete a collection. Press undo. It comes back. |
| Call | 18–22 | "Free, no account, nothing leaves your computer. It's called Tabcove." |

### Cadence

Two videos per week for eight weeks, cross-posted to YouTube Shorts, TikTok, and Instagram Reels. Different hooks, same payoff. Most will do nothing; the format is a lottery where one winner pays for the whole campaign.

### Angles to test

1. The satisfying one — 90 tabs vanish.
2. The fear one — "here's what happens when your tab manager loses everything".
3. The privacy one — the permission dialogue, read aloud, next to a competitor's.
4. The nerd one — "why your tab manager gets slow after 1,000 tabs", explained with the blob-vs-sharded diagram.
5. The student one — "how I keep three literature reviews open at once".

---

## 8. YouTube (long form)

Not a primary channel, but two evergreen videos are worth making once:

1. **"Every Chrome tab manager compared (2026)"** — an honest, thorough comparison that includes Tabcove without favouring it. Honest comparisons rank and get linked; puff pieces do not.
2. **"I built a Chrome extension that can't touch your data — here's how"** — a build-along for developers. Reaches persona 4 and earns GitHub stars, which are themselves a trust signal on the listing.

---

## 9. X / Bluesky / Mastodon

Low expected volume, near-zero cost, and it is where round-up writers look.

- Build in public: weekly progress, real numbers, honest problems.
- Post each measured performance improvement with the number.
- Reply to anyone complaining publicly about losing tabs — helpfully, without pitching unless asked.
- Target: the people who write "best Chrome extensions" round-ups. A single inclusion in a widely-read round-up is worth more than a month of posting.

---

## 10. Review generation

Reviews are simultaneously a ranking signal and the biggest conversion lever. They are also the easiest thing to get wrong in a way that permanently damages a listing.

### What Tabcove does

1. **Nothing in-product.** No review prompt, ever. Rating prompts in a utility extension generate one-star reviews from interrupted users.
2. **Earn the moment instead.** The undo bin and restore points create a genuine "oh thank god" moment. That is when people write reviews unprompted, and it needs no nudge.
3. **Reply to every review, good or bad, within 24 hours.** Publicly visible replies convert readers far better than the reviews themselves.
4. **Fix and follow up.** When a bug reported in a review is fixed, reply to that review saying so. A reviewer who revises a one-star to five-star is the strongest signal a listing can carry.
5. **Ask once, in the right place.** The GitHub README and the site can ask; the product cannot.

### Target trajectory

| Week | Reviews | Rating |
|---|---|---|
| 2 | 5 | ≥ 4.5 |
| 4 | 15 | ≥ 4.6 |
| 8 | 40 | ≥ 4.6 |
| 16 | 100 | ≥ 4.6 |
| 32 | 250 | ≥ 4.6 |

---

## 11. Timeline to 5,000

| Weeks | Focus | Actions | Target users |
|---|---|---|---|
| **0** | Ship | Submit, publish the repo and site, tag the release | 0 → 20 |
| **1–2** | Watch | Reply to every review daily. Hotfix any crash within 48 h. Begin participating on Reddit — no posting. | 20 → 80 |
| **3–4** | Seed | Publish guides 1 and 2. First r/SideProject and r/chrome_extensions show-and-tell. Ship 1.0.1 from real feedback. | 80 → 300 |
| **5–8** | Launch | Product Hunt (gate met). First 4 Shorts. Guides 3 and 4. r/productivity post. | 300 → 900 |
| **9–14** | Compound | 8 more Shorts. Guide 5. Ship 1.1.0 with the top 3 requests. Pursue round-up inclusion. | 900 → 1,800 |
| **15–22** | Rank | Store rank rising on body keywords. Ship 1.2.0 (side panel). Long-form YouTube. Persona-specific subreddit posts. | 1,800 → 3,200 |
| **23–32** | Escape velocity | Word of mouth dominant. Ship 1.3.0 and 1.4.0 (localisation opens non-English store search). | 3,200 → 5,000+ |

---

## 12. Metrics and what they trigger

| Metric | Source | Healthy | If it is not |
|---|---|---|---|
| Weekly installs | Dashboard | Growing week over week | Re-examine the listing before doing more promotion |
| Impression → install | Dashboard | ≥ 10% | Screenshots and short description are wrong |
| Uninstalls / installs | Dashboard | ≤ 25% | Onboarding or a first-run misunderstanding |
| Rating | Dashboard | ≥ 4.5 | **Stop all growth work.** Fix the product. |
| Reviews per 100 users | Derived | ≥ 2 | Not yet earning the "oh thank god" moment |
| Guide traffic | GitHub Pages | Growing | Rewrite for search intent |

**Hard rule:** if the rating drops below 4.3, every growth activity stops until it recovers. Driving traffic to a listing that is converting badly burns the impressions you cannot buy back.

---

## 13. What this plan will not do

- **No paid acquisition.** Extension LTV at £0 revenue does not support CPI.
- **No incentivised reviews.** A policy violation and a permanent listing risk.
- **No bought upvotes or fake accounts.** Detected, and fatal.
- **No mass cold e-mail to bloggers.** Low yield, damages the brand.
- **No comparison content that names and attacks a competitor.** Invites a trademark complaint, and reads as insecure. Beat them by describing what we do.
- **No cross-promotion into the other extensions on this developer account** until each is independently healthy.

---

## 14. The single highest-leverage action

**Reply to every review, within a day, forever.**

It costs minutes, it is the strongest visible signal that the product is maintained — the exact criticism levelled at the market leader — and it converts the readers of those reviews far better than the reviews themselves. It is also the thing a solo developer can sustain when they have no budget, which is the only kind of growth lever that actually gets pulled.
