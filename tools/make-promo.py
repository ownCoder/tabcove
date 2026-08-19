#!/usr/bin/env python3
"""Generate the Chrome Web Store promotional tiles.

    python tools/make-promo.py

Two sizes, both required by the store for a listing that can be featured:
    440 x 280   small tile  — shown in category grids and search results
    1400 x 560  marquee     — shown on the store home page if featured

Both are generated from the same brand constants as the icon set, so a brand
change regenerates everything and the listing cannot drift from the product.
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
PROMO = os.path.join(ROOT, "Store Upload", "Store Assets", "Promo")
ICON = os.path.join(ROOT, "assets", "icon-master-1024.png")

BRAND_600 = (14, 124, 134)
BRAND_900 = (6, 47, 53)
ACCENT = (242, 163, 60)
WHITE = (255, 255, 255)
SOFT = (166, 224, 228)

FONT_DIRS = [r"C:\Windows\Fonts", "/System/Library/Fonts", "/usr/share/fonts/truetype/dejavu"]
BOLD = ["segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"]
REGULAR = ["segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"]


def load_font(candidates, size):
    for directory in FONT_DIRS:
        for name in candidates:
            path = os.path.join(directory, name)
            if os.path.exists(path):
                try:
                    return ImageFont.truetype(path, size)
                except OSError:
                    continue
    return ImageFont.load_default()


def diagonal_gradient(size, top_left, bottom_right):
    """A diagonal wash — richer than a flat fill, still calm."""
    w, h = size
    small = Image.new("RGB", (64, 64))
    pixels = small.load()
    for y in range(64):
        for x in range(64):
            t = (x / 63 * 0.45) + (y / 63 * 0.55)
            pixels[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(top_left, bottom_right))
    return small.resize((w, h), Image.BICUBIC)


def draw_tabs(draw, x, y, width, gap, height, widths, colours):
    """The three-bar motif from the logo, reused as a decorative element."""
    for i, ratio in enumerate(widths):
        top = y + i * (height + gap)
        draw.rounded_rectangle(
            [x, top, x + width * ratio, top + height],
            radius=height / 2,
            fill=colours[i],
        )


def small_tile():
    """440 x 280 — dense, legible at thumbnail size. Name plus one claim."""
    w, h = 440, 280
    canvas = diagonal_gradient((w, h), BRAND_600, BRAND_900)
    draw = ImageDraw.Draw(canvas)

    # No decorative bars here. At 440x280 there is no room for a motif that does
    # not collide with the claim, and the claim is what sells the install.
    icon = Image.open(ICON).convert("RGBA").resize((66, 66), Image.LANCZOS)
    canvas.paste(icon, (34, 34), icon)

    draw.text((112, 46), "Tabcove", font=load_font(BOLD, 34), fill=WHITE)
    draw.text((112, 86), "Tab Manager & Session Saver", font=load_font(REGULAR, 15), fill=SOFT)

    draw.text((34, 138), "Save every tab in one click", font=load_font(BOLD, 25), fill=WHITE)
    draw.text((34, 172), "and actually get them back.", font=load_font(BOLD, 25), fill=ACCENT)

    draw.text((34, 226), "Restore points  ·  Undo bin  ·  Instant search",
              font=load_font(REGULAR, 13), fill=SOFT)
    draw.text((34, 246), "100% local  ·  No account  ·  Free",
              font=load_font(REGULAR, 13), fill=SOFT)

    return canvas


def marquee_tile():
    """1400 x 560 — the featured banner. One idea, told large."""
    w, h = 1400, 560
    canvas = diagonal_gradient((w, h), BRAND_600, BRAND_900)
    draw = ImageDraw.Draw(canvas)

    icon = Image.open(ICON).convert("RGBA").resize((104, 104), Image.LANCZOS)
    canvas.paste(icon, (96, 84), icon)

    draw.text((224, 96), "Tabcove", font=load_font(BOLD, 54), fill=WHITE)
    draw.text((228, 158), "Tab Manager & Session Saver", font=load_font(REGULAR, 22), fill=SOFT)

    draw.text((96, 250), "Save every tab in one click —", font=load_font(BOLD, 56), fill=WHITE)
    draw.text((96, 318), "and actually get them back.", font=load_font(BOLD, 56), fill=ACCENT)

    draw.text(
        (96, 412),
        "Restore points  ·  30-day undo bin  ·  Instant search  ·  Tab groups kept",
        font=load_font(REGULAR, 21),
        fill=SOFT,
    )
    draw.text(
        (96, 448),
        "Everything stays on your device. No account, no sign-in, no network access.",
        font=load_font(REGULAR, 21),
        fill=SOFT,
    )

    # The logo motif, large and quiet, anchoring the right-hand side.
    draw_tabs(draw, 1010, 216, 300, 26, 30, [1.0, 0.64, 0.84], [WHITE, ACCENT, WHITE])

    return canvas


def main():
    if not os.path.exists(ICON):
        print("Run tools/make-icons.py first — the promo tiles reuse the icon master.")
        return 1

    os.makedirs(PROMO, exist_ok=True)
    os.makedirs(ASSETS, exist_ok=True)

    for tile, name in ((small_tile(), "promo-small-440x280.png"),
                       (marquee_tile(), "promo-marquee-1400x560.png")):
        for directory in (PROMO, ASSETS):
            tile.save(os.path.join(directory, name))
        print(f"  {name}  {tile.width}x{tile.height}")

    print(f"\nPromo tiles written to {PROMO}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
