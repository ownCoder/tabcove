# Branding — Tabcove

**Version:** 1.0
**Date:** 19 August 2026
**Status:** Locked for v1.0.0. All assets are generated from `tools/make-icons.py` and `tools/make-promo.py`, so the brand cannot drift between the product and the listing.

---

## 1. Name

# Tabcove

Pronounced *TAB-cove*. Always one word, always capital T only. Never "TabCove", never "Tab Cove", never "TABCOVE" outside of a wordmark lockup.

**Store title:** `Tabcove — Tab Manager & Session Saver`

The suffix is a search-visibility device, not part of the brand. In the product UI, the brand is always just **Tabcove**.

---

## 2. Tagline

> **A safe harbour for every tab.**

Alternates, cleared for use in specific contexts:

| Context | Line |
|---|---|
| Store short description | Save all your tabs in one click — and actually get them back. |
| Product Hunt / social | The tab manager that doesn't lose your tabs. |
| Welcome screen | Your tabs are safe here. |
| Options footer | Local-first. No account. No network. |

**Banned phrasing:** "revolutionary", "game-changing", "the best", "10x", "supercharge", "AI-powered" (in v1 there is no AI, and claiming otherwise is both dishonest and a Chrome Web Store misrepresentation risk).

---

## 3. Brand personality

| Trait | Expression | Anti-pattern |
|---|---|---|
| **Calm** | Muted teal, generous whitespace, no animation over 180 ms | Bouncing badges, confetti |
| **Precise** | "12 tabs stowed · 4 groups preserved" | "Done!" |
| **Honest** | Says what it cannot do, on the page where you would find out | Hiding limits behind an upgrade wall |
| **Unhurried** | Never interrupts. One dismissible reminder, at most, ever. | Rating prompts, upsell modals |

**Voice rules**

1. Second person, present tense. "Your tabs are saved." Not "Tabs have been saved!"
2. Numbers over adjectives. "Restores in 40 ms" beats "blazing fast".
3. No exclamation marks anywhere in the product.
4. Every error says what happened, why, and what to do next — in that order.

---

## 4. Logo concept

### 4.1 The mark

A **cove**: a thick white arc forming a wide U — a harbour basin with two arms
reaching up — cradling **three stacked bars** that read as saved tabs at rest.
The middle bar is beacon amber: one warm point of light in the harbour.

```
   ·                                    ·        120 deg of open sky at the top.
    ·                                  ·         A cove is a shelter, not a cage
     ·      ================          ·          — and a narrow gap reads as a
      ·     ==========               ·             face rather than a harbour.
       ·    =============           ·
        ·                          ·             The three bars are deliberately
         ·.                      .·              uneven: a real list, not a
            ·.                .·                 logo cliche.
                ·.._____..·
```

**Why it works**

- **Legible at 16 px.** One enclosing shape, three bars, and one amber accent that survives downsampling. Verified by exporting 16 px and inspecting it at 8x.
- **Category-distinct.** Competitors draw stacks of rectangles (OneTab), grids, folders, or letterforms. Nothing in the category draws an enclosure.
- **Semantically exact.** The shape *is* the promise: something protective wrapped around your tabs.
- **Not Chrome-like.** No circle-in-circle, no four-colour ring, no sphere. Complies with the Chrome Web Store branding rules.

### 4.2 Construction rules

Every value below is a constant in `tools/make-icons.py`, expressed as a fraction
of the canvas, so the mark is resolution-independent and reproducible.

| Rule | Value |
|---|---|
| Canvas | 1024 x 1024 master, drawn at 4x supersampling, exported to 16/32/48/128 |
| Tile | Rounded square, 22% corner radius, vertical gradient `#0E7C86` to `#062F35` |
| Arc margin | 15% of canvas on all sides |
| Arc stroke | 9.5% of canvas width, round caps |
| Arc sweep | 240 degrees, drawn -30 deg clockwise to 210 deg — a 120 degree opening at the top |
| Bar block width | 32% of canvas |
| Bar height / gap | 6.5% / 4.2% of canvas |
| Bar widths | 100% / 68% / 86% of the block width, top to bottom |
| Bar colours | White, **amber `#F2A33C`**, white |
| Bar corner radius | Fully rounded ends |
| Clearance | The build asserts that the outermost bar corners sit inside the arc's inner radius, so the two white shapes can never merge into one blob at 16 px |

### 4.3 Wordmark

`Tabcove` set in the system UI stack at 600 weight, `-0.02em` tracking. The mark sits left of the wordmark at 1.15× cap-height with a gap of 0.4× cap-height. Never stretch, recolour, rotate, or outline either element.

---

## 5. Colour palette

### 5.1 Core

| Token | Hex | Role |
|---|---|---|
| `--brand-900` | `#062F35` | Deepest teal — dark-mode surfaces, logo gradient end |
| `--brand-700` | `#0A5A63` | Pressed states, dark-mode brand text |
| `--brand-600` | **`#0E7C86`** | **Primary brand.** Buttons, links, focus rings, logo gradient start |
| `--brand-500` | `#149AA6` | Hover |
| `--brand-200` | `#A6E0E4` | Tinted backgrounds, selection |
| `--brand-050` | `#EAF7F8` | Subtlest fill |

**Why teal.** A deliberate, checked decision: OneTab owns dark blue, Toby owns coral/orange, Workona owns indigo/purple, Session Buddy owns grey-blue, Tab Session Manager owns green. Deep harbour teal is the only calm, trustworthy hue left unclaimed in the category — and it reads as "water", which the name earns.

### 5.2 Accent

| Token | Hex | Role |
|---|---|---|
| `--accent-500` | **`#F2A33C`** | **Beacon amber.** Exactly one use per screen: the single most important action, or a restore-point marker. |
| `--accent-100` | `#FDF0DC` | Reminder banner fill |

Scarcity is the point. Amber appearing twice on a screen means the design is wrong.

### 5.3 Semantic

| Token | Light | Dark | Role |
|---|---|---|---|
| `--ok` | `#1F8A4C` | `#41C07A` | Success, restored |
| `--warn` | `#B4690E` | `#E0A33F` | Backup due, quota high |
| `--danger` | `#C22B2B` | `#F26E6E` | Delete, quota critical |

### 5.4 Neutrals

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F7F9FA` | `#0C1416` |
| `--surface` | `#FFFFFF` | `#131F22` |
| `--surface-2` | `#F1F5F6` | `#1B292D` |
| `--border` | `#DCE4E6` | `#25373C` |
| `--text` | `#0F1B1E` | `#E8F1F2` |
| `--text-muted` | `#5A6B6F` | `#9BB0B4` |

### 5.5 Contrast verification

All pairs used for text meet **WCAG 2.1 AA** (≥ 4.5:1 body, ≥ 3:1 large text and UI boundaries). Verified by `tools/validate.py --contrast`; results recorded in [`testing-report.md`](testing-report.md).

| Pair | Measured | Requirement | Result |
|---|---|---|---|
| `--text` on `--bg` (light) | 16.63:1 | 4.5:1 | PASS |
| `--text-muted` on `--bg` (light) | 5.28:1 | 4.5:1 | PASS |
| `--text-faint` on `--surface` (light) | 3.08:1 | 3:1 | PASS |
| `#FFFFFF` on `--brand-600` | 4.95:1 | 4.5:1 | PASS |
| `#20160A` on `--accent-500` (primary button) | 8.54:1 | 4.5:1 | PASS |
| `--brand-600` link on `--bg` (light) | 4.68:1 | 4.5:1 | PASS |
| `--danger` on `--bg` (light) | 5.41:1 | 4.5:1 | PASS |
| `--text` on `--surface` (dark) | 14.67:1 | 4.5:1 | PASS |
| `--text-muted` on `--bg` (dark) | 8.22:1 | 4.5:1 | PASS |
| `--brand-600` link on `--bg` (dark) | 7.37:1 | 4.5:1 | PASS |
| `--danger` on `--bg` (dark) | 6.41:1 | 4.5:1 | PASS |

Ratios are produced by `python tools/validate.py --contrast`, which fails the build on a regression. The numbers above are the measured output, not design intent.

---

## 6. Typography

**Stack:**

```css
font-family:
  "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text",
  "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

`Inter` is referenced but **never downloaded** — no `@font-face`, no webfont file, no Google Fonts link. A network request for a font would break the "no network access" promise, which is a core differentiator. Users who have Inter installed get it; everyone else gets a native system face that already looks correct on their OS.

Monospace, used only for URLs and export previews:

```css
font-family: "SF Mono", "Cascadia Mono", "JetBrains Mono", Consolas, "Liberation Mono", monospace;
```

### Scale

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `--fs-display` | 24 / 30 px | 650 | Welcome headline |
| `--fs-title` | 17 / 24 px | 620 | Page + section titles |
| `--fs-body` | 14 / 20 px | 440 | Default |
| `--fs-item` | 13.5 / 19 px | 450 | Tab rows |
| `--fs-meta` | 12 / 16 px | 500 | Counts, timestamps, hostnames |
| `--fs-micro` | 11 / 14 px | 600 | Badges, keyboard hints |

Minimum shipped size is 11 px, used only for uppercase badges with increased tracking.

---

## 7. Iconography

Line icons drawn inline as SVG. No icon font, no sprite sheet, no third-party icon library (licensing risk and payload for no gain).

| Property | Value |
|---|---|
| Grid | 24 × 24 |
| Stroke | 1.75 px, `currentColor` |
| Caps / joins | Round |
| Fill | None, except the brand mark |

Set: stow, library, search, restore, group, pin, trash, undo, export, import, settings, duplicate, clock (restore points), shield (privacy), keyboard, chevron, close, plus, check, alert.

---

## 8. Motion

| Interaction | Duration | Easing |
|---|---|---|
| Hover / focus | 90 ms | `ease-out` |
| Panel + toast enter | 160 ms | `cubic-bezier(.2,.8,.2,1)` |
| Panel exit | 120 ms | `ease-in` |
| Row reorder | 180 ms | `cubic-bezier(.2,.8,.2,1)` |

Nothing animates longer than 200 ms. Under `prefers-reduced-motion: reduce`, all transitions collapse to 1 ms and transforms are removed — verified in [`testing-report.md`](testing-report.md).

---

## 9. Asset inventory

| Asset | Size | Generated by | Destination |
|---|---|---|---|
| `icon16.png` | 16×16 | `make-icons.py` | `extension/icons/`, Store Assets |
| `icon32.png` | 32×32 | `make-icons.py` | `extension/icons/`, Store Assets |
| `icon48.png` | 48×48 | `make-icons.py` | `extension/icons/`, Store Assets |
| `icon128.png` | 128×128 | `make-icons.py` | `extension/icons/`, Store Assets, `site/` |
| `icon.svg` | vector master | `make-icons.py` | `assets/` |
| `promo-small-440x280.png` | 440×280 | `make-promo.py` | Store Assets/Promo |
| `promo-marquee-1400x560.png` | 1400×560 | `make-promo.py` | Store Assets/Promo |
| `01`–`05` screenshots | 1280×800 | `make-screenshots.py` | `screenshots/`, Store Assets |

---

## 10. Usage rules

**Do**

- Use the mark on `--brand-600`, `--brand-900`, white, or `--bg`.
- Keep clear space of at least 25% of the mark's width on every side.
- Say "Tabcove for Chrome" or "Tabcove — a Chrome extension".

**Do not**

- Recolour, outline, rotate, skew, or add effects to the mark.
- Place the mark on a busy photograph or a mid-tone that drops contrast below 3:1.
- Use the word "Chrome", "Google", or any Google mark in the extension name, or imply endorsement by Google. (See [Chrome Web Store Branding Guidelines](https://developer.chrome.com/docs/webstore/branding).)
- Use any competitor's mark, icon, colour, or trade dress. OneTab may be named only as a factual statement of import compatibility.

---

## 11. Licensing of brand assets

The source code is MIT. **The Tabcove name, logo, and icon set are not.** They are reserved to the project owner, and `LICENSE` carries an explicit carve-out. Forks must ship under a different name and mark — the standard practice that prevents a malicious fork from trading on the brand, which is precisely how The Great Suspender's users were harmed.
