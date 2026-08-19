#!/usr/bin/env python3
"""Generate the complete Tabcove icon set from code.

The mark is a COVE: a thick, rounded harbour arm sweeping around three stacked
tab bars at rest inside it. The shape is the promise - something protective
wrapped around your tabs - and it is deliberately unlike anything else in the
category, where every competitor draws stacks of rectangles, grids, or letters.

Everything is generated rather than hand-drawn, so a brand change regenerates
the entire set and the store listing can never drift from the product.

    python tools/make-icons.py

Outputs:
    extension/icons/icon{16,32,48,128}.png
    assets/icon-master-1024.png
    assets/icon.svg
    site/icon-128.png
    Store Upload/2-Store-listing/Icons/icon-{16,32,48,128}.png
"""

import os
import math

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT_ICONS = os.path.join(ROOT, "extension", "icons")
ASSETS = os.path.join(ROOT, "assets")
SITE = os.path.join(ROOT, "site")
STORE_ICONS = os.path.join(ROOT, "Store Upload", "2-Store-listing", "Icons")

MASTER = 1024
SIZES = [16, 32, 48, 128]

# docs/branding.md section 5 - deep harbour teal, unclaimed in this category.
BRAND_600 = (14, 124, 134)
BRAND_900 = (6, 47, 53)
BAR = (255, 255, 255)
ACCENT = (242, 163, 60)


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def rounded_rect_mask(size, radius, supersample=4):
    """A rounded-rectangle alpha mask, drawn oversized then downsampled.

    Pillow's rounded_rectangle aliases badly at icon sizes; supersampling is the
    cheapest way to get edges that survive a 16px export.
    """
    w = h = size * supersample
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, w - 1, h - 1], radius=radius * supersample, fill=255)
    return mask.resize((size, size), Image.LANCZOS)


def vertical_gradient(size, top, bottom):
    grad = Image.new("RGB", (1, size))
    for y in range(size):
        grad.putpixel((0, y), lerp(top, bottom, y / max(1, size - 1)))
    return grad.resize((size, size), Image.BICUBIC)


def draw_master():
    """Draw the 1024px master at 4x supersampling, then downsample once."""
    ss = 4
    n = MASTER * ss
    canvas = Image.new("RGBA", (n, n), (0, 0, 0, 0))

    # ---- Tile: rounded square with a vertical teal gradient -------------------
    tile = vertical_gradient(n, BRAND_600, BRAND_900).convert("RGBA")
    tile_mask = Image.new("L", (n, n), 0)
    ImageDraw.Draw(tile_mask).rounded_rectangle(
        [0, 0, n - 1, n - 1], radius=int(n * 0.22), fill=255
    )
    canvas.paste(tile, (0, 0), tile_mask)

    layer = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    # ---- The cove: a wide U, open at the top ----------------------------------
    # A 120-degree opening, not a near-closed ring. Two arms reaching up from a
    # rounded basin read as a harbour mouth; a narrow gap reads as a face.
    cx = cy = n / 2
    margin = n * 0.15
    stroke = n * 0.095
    outer_r = (n - 2 * margin) / 2
    inner_r = outer_r - stroke
    box = [margin, margin, n - margin, n - margin]

    # Pillow angles: 0 deg = 3 o'clock, increasing clockwise. Drawing -30 -> 210
    # sweeps 240 degrees through the bottom, leaving 120 degrees of sky on top.
    draw.arc(box, start=-30, end=210, fill=BAR + (255,), width=int(stroke))

    # Round the arm ends. Pillow's arc has butt caps, which look snapped off.
    # NOTE: Pillow grows `width` INWARDS from the bounding box, so the stroke's
    # centreline sits at outer_r - stroke/2, not at outer_r. Putting the caps on
    # outer_r leaves them floating off the ends.
    cap_r = outer_r - stroke / 2
    for angle in (-30, 210):
        rad = math.radians(angle)
        ex = cx + cap_r * math.cos(rad)
        ey = cy + cap_r * math.sin(rad)
        r = stroke / 2
        draw.ellipse([ex - r, ey - r, ex + r, ey + r], fill=BAR + (255,))

    # ---- Three tab bars at rest inside the cove -------------------------------
    # Sized so that even the widest bar clears the arm by ~50px at the master
    # size, because two white shapes that touch merge into one blob at 16px.
    # Widths are deliberately uneven: a real list, not a logo cliche.
    inner_w = n * 0.32
    bar_h = n * 0.065
    gap = n * 0.042
    widths = [1.0, 0.68, 0.86]

    total_h = 3 * bar_h + 2 * gap
    top = cy - total_h / 2

    # Sanity check: the corners of the outermost bars must sit inside the arc.
    half_w = inner_w / 2
    extreme_y = total_h / 2
    assert half_w**2 + extreme_y**2 < inner_r**2, "bars collide with the cove arm"

    for i, ratio in enumerate(widths):
        w = inner_w * ratio
        x0 = cx - inner_w / 2
        y0 = top + i * (bar_h + gap)
        # The middle bar is the accent: one warm point of light in the harbour.
        colour = ACCENT if i == 1 else BAR
        draw.rounded_rectangle(
            [x0, y0, x0 + w, y0 + bar_h], radius=bar_h / 2, fill=colour + (255,)
        )

    canvas = Image.alpha_composite(canvas, layer)
    return canvas.resize((MASTER, MASTER), Image.LANCZOS)


SVG_TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Tabcove">
  <title>Tabcove</title>
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0E7C86"/>
      <stop offset="1" stop-color="#062F35"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="225" fill="url(#tile)"/>
  <!-- The cove: a wide U with 120 degrees of sky at the top. -->
  <path d="{arc}" fill="none" stroke="#FFFFFF" stroke-width="97" stroke-linecap="round"/>
  <!-- Three tab bars at rest. The middle one carries the accent. -->
  <rect x="348" y="369" width="328" height="67" rx="33" fill="#FFFFFF"/>
  <rect x="348" y="479" width="223" height="67" rx="33" fill="#F2A33C"/>
  <rect x="348" y="589" width="282" height="67" rx="33" fill="#FFFFFF"/>
</svg>
"""


def arc_path():
    """SVG arc path matching the raster arc: -30 degrees clockwise to 210.

    The radius is the stroke CENTRELINE, because SVG centres a stroke on its
    path while Pillow grows it inwards. outer 358.4 - stroke 97/2 = 309.9.
    """
    cx = cy = 512.0
    r = 309.9

    def point(deg):
        rad = math.radians(deg)
        return cx + r * math.cos(rad), cy + r * math.sin(rad)

    x0, y0 = point(-30)
    x1, y1 = point(210)
    # 240 degrees swept, so large-arc-flag = 1; drawn clockwise, sweep-flag = 1.
    return f"M {x0:.1f} {y0:.1f} A {r:.1f} {r:.1f} 0 1 1 {x1:.1f} {y1:.1f}"


def main():
    for directory in (EXT_ICONS, ASSETS, SITE, STORE_ICONS):
        os.makedirs(directory, exist_ok=True)

    master = draw_master()
    master.save(os.path.join(ASSETS, "icon-master-1024.png"))

    for size in SIZES:
        icon = master.resize((size, size), Image.LANCZOS)
        icon.save(os.path.join(EXT_ICONS, f"icon{size}.png"))
        icon.save(os.path.join(STORE_ICONS, f"icon-{size}.png"))
        print(f"  icon{size}.png")

    master.resize((128, 128), Image.LANCZOS).save(os.path.join(SITE, "icon-128.png"))

    with open(os.path.join(ASSETS, "icon.svg"), "w", encoding="utf-8") as f:
        f.write(SVG_TEMPLATE.format(arc=arc_path()))

    print(f"Icons written to {EXT_ICONS}")


if __name__ == "__main__":
    main()
