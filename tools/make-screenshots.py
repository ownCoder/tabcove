#!/usr/bin/env python3
"""Compose the Chrome Web Store screenshots.

Takes the raw captures produced by `node tools/drive.mjs shots` - which are
photographs of the real extension running in real Chrome - and composes each one
into the exact 1280x800 tile the store requires, with a caption.

Captions matter more than most people assume: the store shows screenshots in a
carousel where the first two are often the only ones seen, and a caption is the
only text that survives the thumbnail. Each caption states one differentiator.

    python tools/drive.mjs shots      # capture first
    python tools/make-screenshots.py  # then compose
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "screenshots", "raw")
OUT = os.path.join(ROOT, "screenshots")
STORE = os.path.join(ROOT, "Store Upload", "2-Store-listing", "Screenshots")
EXTRAS = os.path.join(ROOT, "Store Upload", "2-Store-listing", "Extras")

# The Chrome Web Store accepts a MAXIMUM OF FIVE screenshots. Eight are composed
# because they are all useful -- for the site, for Product Hunt, and as swaps if
# the listing underperforms -- but only these five are staged for upload, in this
# order. The rest go to Extras/ so the store folder can never exceed the cap.
SHIPPED = 5

W, H = 1280, 800

# Brand tokens, mirroring extension/styles/tokens.css.
BRAND_600 = (14, 124, 134)
BRAND_900 = (6, 47, 53)
BRAND_050 = (234, 247, 248)
ACCENT = (242, 163, 60)
TEXT = (15, 27, 30)
MUTED = (90, 107, 111)
BG = (247, 249, 250)
DARK_BG = (12, 20, 22)
DARK_TEXT = (232, 241, 242)
DARK_MUTED = (155, 176, 180)

FONT_DIRS = [
    r"C:\Windows\Fonts",
    "/System/Library/Fonts",
    "/usr/share/fonts/truetype/dejavu",
]
BOLD_CANDIDATES = ["segoeuib.ttf", "arialbd.ttf", "SFNSDisplay-Bold.otf", "DejaVuSans-Bold.ttf"]
REGULAR_CANDIDATES = ["segoeui.ttf", "arial.ttf", "SFNSText.otf", "DejaVuSans.ttf"]


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


# Caption per shot: a headline that claims one thing, and a line of proof.
SHOTS = [
    # ---- The five that are uploaded. Order is the carousel order, and the -----
    # ---- first is shown largest, so it carries the whole argument alone. ------
    (
        "01-library.png",
        "Every tab you saved, still findable",
        "Collections keep your Chrome tab groups — names and colours intact.",
        "light",
    ),
    (
        "02-search.png",
        "Search thousands of saved tabs instantly",
        "Titles, addresses, and collection names — measured at 7 ms across 20,000 tabs.",
        "light",
    ),
    (
        "03-restore-points.png",
        "Restore points, so nothing is ever final",
        "A snapshot of your whole library is saved before anything destructive.",
        "light",
    ),
    (
        "07-popup.png",
        "One click. Every tab, safely stowed.",
        "The button tells you exactly what it will save before you press it.",
        "light",
    ),
    (
        "05-privacy.png",
        "Seven permissions. No access to any website.",
        "Everything you save stays on your device. No account, no sign-in, no network.",
        "light",
    ),

    # ---- Beyond the store's cap of five. Composed anyway, staged to Extras/, --
    # ---- and used for the site, Product Hunt, and any future Edge listing. ----
    (
        "04-undo-bin.png",
        "A 30-day undo bin for deleted collections",
        "Delete something by accident and simply put it back.",
        "light",
    ),
    (
        "06-dark.png",
        "A real dark mode, and full keyboard control",
        "WCAG AA contrast, visible focus, and Ctrl+K for everything.",
        "dark",
    ),
    (
        "08-welcome.png",
        "Set up in fifteen seconds",
        "No tour, no signup. Open it, press one button, and you are done.",
        "light",
    ),
]


def gradient(size, top, bottom):
    w, h = size
    strip = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        strip.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    return strip.resize((w, h), Image.BICUBIC)


def rounded(image, radius):
    """Round an image's corners, returning RGBA."""
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, *[d - 1 for d in image.size]], radius=radius, fill=255)
    out = image.convert("RGBA")
    out.putalpha(mask)
    return out


def drop_shadow(image, offset=(0, 14), blur=22, opacity=70):
    """A soft shadow sized to the image, returned with the image composited on top."""
    pad = blur * 3
    canvas = Image.new("RGBA", (image.width + pad * 2, image.height + pad * 2), (0, 0, 0, 0))

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    silhouette = Image.new("RGBA", image.size, (6, 47, 53, opacity))
    silhouette.putalpha(Image.eval(image.getchannel("A"), lambda a: a * opacity // 255))
    shadow.paste(silhouette, (pad + offset[0], pad + offset[1]), silhouette)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))

    canvas = Image.alpha_composite(canvas, shadow)
    canvas.paste(image, (pad, pad), image)
    return canvas, pad


def wrap(draw, text, font, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def compose(raw_name, headline, subline, scheme, index):
    raw_path = os.path.join(RAW, raw_name)
    if not os.path.exists(raw_path):
        print(f"  ! missing capture: {raw_name}")
        return None

    shot = Image.open(raw_path).convert("RGB")

    dark = scheme == "dark"
    base_bg = DARK_BG if dark else BG
    head_colour = DARK_TEXT if dark else TEXT
    sub_colour = DARK_MUTED if dark else MUTED

    canvas = Image.new("RGB", (W, H), base_bg)

    # A soft brand wash behind the caption, so the tile reads as branded rather
    # than as a bare screenshot.
    wash_h = 260
    wash = gradient((W, wash_h), BRAND_900 if dark else BRAND_050, base_bg)
    canvas.paste(wash, (0, 0))

    draw = ImageDraw.Draw(canvas)

    font_head = load_font(BOLD_CANDIDATES, 38)
    font_sub = load_font(REGULAR_CANDIDATES, 19)
    font_num = load_font(BOLD_CANDIDATES, 15)

    margin = 64
    y = 46

    # Step number chip - orients the viewer inside the carousel.
    chip_w, chip_h = 30, 22
    draw.rounded_rectangle(
        [margin, y, margin + chip_w, y + chip_h],
        radius=6,
        fill=ACCENT if not dark else BRAND_600,
    )
    num = str(index)
    nw = draw.textlength(num, font=font_num)
    draw.text(
        (margin + (chip_w - nw) / 2, y + 3),
        num,
        font=font_num,
        fill=(32, 22, 10) if not dark else (255, 255, 255),
    )

    head_lines = wrap(draw, headline, font_head, W - margin * 2 - 48)
    ty = y + chip_h + 14
    for line in head_lines:
        draw.text((margin, ty), line, font=font_head, fill=head_colour)
        ty += 46

    for line in wrap(draw, subline, font_sub, W - margin * 2 - 48):
        draw.text((margin, ty + 4), line, font=font_sub, fill=sub_colour)
        ty += 26

    # ---- The screenshot itself -------------------------------------------------
    top = max(196, ty + 26)
    available_h = H - top - 28
    available_w = W - margin * 2

    scale = min(available_w / shot.width, available_h / shot.height, 1.0)
    target = (max(1, int(shot.width * scale)), max(1, int(shot.height * scale)))
    resized = shot.resize(target, Image.LANCZOS)

    framed = rounded(resized, 12)
    shadowed, pad = drop_shadow(framed)

    x = (W - shadowed.width) // 2
    canvas.paste(shadowed, (x, top - pad), shadowed)

    return canvas


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(STORE, exist_ok=True)
    os.makedirs(EXTRAS, exist_ok=True)

    # Clear both, so a rename or a reorder cannot leave a stale sixth file in the
    # upload folder and silently break the cap.
    for directory in (STORE, EXTRAS):
        for stale in os.listdir(directory):
            if stale.endswith(".png"):
                os.remove(os.path.join(directory, stale))

    if not os.path.isdir(RAW):
        print("No raw captures found. Run: node tools/drive.mjs shots")
        return 1

    made = 0
    for index, (raw_name, headline, subline, scheme) in enumerate(SHOTS, start=1):
        canvas = compose(raw_name, headline, subline, scheme, index)
        if canvas is None:
            continue

        out_name = f"{index:02d}-{raw_name.split('-', 1)[1]}"
        destination = STORE if index <= SHIPPED else EXTRAS

        canvas.save(os.path.join(OUT, out_name))
        canvas.save(os.path.join(destination, out_name))

        where = "-> upload" if index <= SHIPPED else "-> Extras (over the 5 cap)"
        print(f"  {out_name}  1280x800  {where}")
        made += 1

    print(f"\n{made} store screenshots written to {OUT} and {STORE}")
    return 0 if made == len(SHOTS) else 1


if __name__ == "__main__":
    sys.exit(main())
