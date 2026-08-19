#!/usr/bin/env python3
"""Tabcove — pre-submission self-audit.

Turns the promises in docs/compliance.md into checks that FAIL THE BUILD. A
guarantee nobody verifies is a guarantee that quietly stops being true.

    python tools/validate.py
    python tools/validate.py --contrast   # also print the WCAG contrast table

Checks:
  manifest    valid JSON, MV3, version, no broad permissions, CSP, icons present
  network     no fetch / XHR / WebSocket / sendBeacon / remote script anywhere
  unsafe      no eval, new Function, inline handlers, or remote code
  xss         no innerHTML/outerHTML/insertAdjacentHTML assignment from data
  assets      every referenced icon, stylesheet, and script exists
  size        unpacked size within budget
  contrast    every declared text pair meets WCAG 2.1 AA
"""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = os.path.join(ROOT, "extension")

ERRORS = []
WARNINGS = []
CHECKS = 0


def check(condition, message, warn_only=False):
    global CHECKS
    CHECKS += 1
    if condition:
        return True
    (WARNINGS if warn_only else ERRORS).append(message)
    return False


def source_files(exts=(".js", ".html", ".css", ".json")):
    for base, dirs, files in os.walk(EXT):
        dirs[:] = [d for d in dirs if d not in {"node_modules", ".git"}]
        for name in files:
            if name.endswith(exts):
                yield os.path.join(base, name)


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def rel(path):
    return os.path.relpath(path, ROOT).replace("\\", "/")


# --------------------------------------------------------------- manifest ---

def check_manifest():
    path = os.path.join(EXT, "manifest.json")
    if not check(os.path.exists(path), "manifest.json is missing"):
        return None

    try:
        manifest = json.loads(read(path))
    except json.JSONDecodeError as e:
        ERRORS.append(f"manifest.json is not valid JSON: {e}")
        return None

    check(manifest.get("manifest_version") == 3, "manifest_version must be 3")
    check(
        re.fullmatch(r"\d+\.\d+\.\d+", manifest.get("version", "")),
        "version must be MAJOR.MINOR.PATCH",
    )
    check(len(manifest.get("name", "")) <= 75, "name exceeds the 75-character limit")
    check(
        len(manifest.get("description", "")) <= 132,
        "description exceeds the 132-character store limit",
    )
    check("minimum_chrome_version" in manifest, "minimum_chrome_version should be declared")

    # ---- Permissions: the whole install-dialogue argument lives here ----
    allowed = {
        "tabs",
        "tabGroups",
        "storage",
        "unlimitedStorage",
        "contextMenus",
        "favicon",
        "alarms",
    }
    declared = set(manifest.get("permissions", []))
    check(
        declared <= allowed,
        f"undocumented permissions declared: {sorted(declared - allowed)}",
    )

    for forbidden in (
        "host_permissions",
        "content_scripts",
        "web_accessible_resources",
        "externally_connectable",
    ):
        check(forbidden not in manifest, f"{forbidden} must not be present")

    for forbidden in ("<all_urls>", "http://*/*", "https://*/*", "scripting", "downloads",
                      "history", "bookmarks", "identity", "management", "cookies",
                      "webRequest", "declarativeNetRequest", "notifications", "proxy"):
        check(forbidden not in declared, f"permission '{forbidden}' must not be declared")

    check(
        "optional_host_permissions" not in manifest,
        "optional_host_permissions must not be present in v1",
    )

    # ---- CSP ----
    csp = manifest.get("content_security_policy", {}).get("extension_pages", "")
    check("script-src 'self'" in csp, "CSP must pin script-src to 'self'")
    check(
        "unsafe-eval" not in csp and "unsafe-inline" not in csp,
        "CSP must not allow unsafe-eval or unsafe-inline",
    )

    # ---- Background ----
    background = manifest.get("background", {})
    check("service_worker" in background, "MV3 requires a service_worker background")
    check(background.get("type") == "module", "the service worker should be an ES module")

    return manifest


# --------------------------------------------------------------- network ---

NETWORK_PATTERNS = [
    (r"\bfetch\s*\(", "fetch()"),
    (r"\bXMLHttpRequest\b", "XMLHttpRequest"),
    (r"\bWebSocket\b", "WebSocket"),
    (r"\bEventSource\b", "EventSource"),
    (r"navigator\s*\.\s*sendBeacon", "navigator.sendBeacon"),
    (r"\bimportScripts\s*\(", "importScripts()"),
    (r"""<script[^>]+src=["']https?://""", "a remotely-hosted <script>"),
    (r"""<link[^>]+href=["']https?://""", "a remotely-hosted stylesheet"),
    (r"@import\s+url\(['\"]?https?://", "a remote CSS @import"),
    (r"""url\(['\"]?https?://""", "a remote CSS asset"),
]


def check_network():
    """The zero-network guarantee, enforced rather than promised."""
    for path in source_files():
        text = read(path)
        for pattern, label in NETWORK_PATTERNS:
            for match in re.finditer(pattern, text):
                line = text[: match.start()].count("\n") + 1
                ERRORS.append(
                    f"network access found: {label} at {rel(path)}:{line} — "
                    "Tabcove declares that it contains no networking code"
                )
    global CHECKS
    CHECKS += 1


# ---------------------------------------------------------------- unsafe ---

UNSAFE_PATTERNS = [
    (r"(?<![.\w])eval\s*\(", "eval()"),
    (r"new\s+Function\s*\(", "new Function()"),
    (r"\bsetTimeout\s*\(\s*['\"]", "setTimeout with a string body"),
    (r"\bsetInterval\s*\(\s*['\"]", "setInterval with a string body"),
    (r"\son(click|load|error|change|submit|input|focus|blur|mouseover)\s*=\s*['\"]",
     "an inline event handler attribute"),
    (r"javascript:", "a javascript: URL"),
]


def check_unsafe():
    for path in source_files():
        text = read(path)
        for pattern, label in UNSAFE_PATTERNS:
            for match in re.finditer(pattern, text):
                line = text[: match.start()].count("\n") + 1
                snippet = text[match.start() : match.start() + 60].split("\n")[0]

                # constants.js legitimately lists javascript: as a scheme to BLOCK.
                if label == "a javascript: URL" and (
                    "EXCLUDED_SCHEMES" in text[max(0, match.start() - 400) : match.start()]
                    or "javascript:alert" in snippet
                ):
                    continue

                ERRORS.append(f"unsafe pattern: {label} at {rel(path)}:{line} — {snippet}")
    global CHECKS
    CHECKS += 1


# ------------------------------------------------------------------- xss ---

def check_xss():
    """Data must never reach the DOM as markup. See lib/dom.js."""
    pattern = re.compile(r"\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML\s*\(")
    for path in source_files((".js",)):
        text = read(path)
        for match in re.finditer(pattern, text):
            line = text[: match.start()].count("\n") + 1
            ERRORS.append(
                f"markup injection risk at {rel(path)}:{line} — "
                "use textContent/createElement instead (lib/dom.js)"
            )
    global CHECKS
    CHECKS += 1


# ---------------------------------------------------------------- assets ---

def check_assets(manifest):
    if not manifest:
        return

    for size, path in (manifest.get("icons") or {}).items():
        check(
            os.path.exists(os.path.join(EXT, path)),
            f"icon {size} is missing: {path}",
        )

    sw = manifest.get("background", {}).get("service_worker")
    if sw:
        check(os.path.exists(os.path.join(EXT, sw)), f"service worker missing: {sw}")

    popup = manifest.get("action", {}).get("default_popup")
    if popup:
        check(os.path.exists(os.path.join(EXT, popup)), f"popup missing: {popup}")

    options = manifest.get("options_ui", {}).get("page")
    if options:
        check(os.path.exists(os.path.join(EXT, options)), f"options page missing: {options}")

    # Every local href/src in every HTML page must resolve.
    for path in source_files((".html",)):
        base = os.path.dirname(path)
        for match in re.finditer(r"""(?:src|href)=["'](?!https?:|#|mailto:)([^"']+)["']""", read(path)):
            target = match.group(1).split("?")[0].split("#")[0]
            if not target:
                continue
            resolved = os.path.normpath(os.path.join(base, target))
            check(os.path.exists(resolved), f"{rel(path)} references a missing file: {target}")

    # Every ES-module import must resolve too — a typo here is a blank page.
    for path in source_files((".js",)):
        base = os.path.dirname(path)
        for match in re.finditer(r"""from\s+["'](\.[^"']+)["']""", read(path)):
            resolved = os.path.normpath(os.path.join(base, match.group(1)))
            check(os.path.exists(resolved), f"{rel(path)} imports a missing module: {match.group(1)}")


# ------------------------------------------------------------------ size ---

def check_size():
    total = 0
    biggest = []
    for base, _dirs, files in os.walk(EXT):
        for name in files:
            size = os.path.getsize(os.path.join(base, name))
            total += size
            biggest.append((size, rel(os.path.join(base, name))))

    check(total < 5 * 1024 * 1024, f"unpacked size {total / 1024:.0f} KB exceeds 5 MB")
    check(
        total < 400 * 1024,
        f"unpacked size {total / 1024:.0f} KB exceeds the 400 KB self-imposed budget",
        warn_only=True,
    )
    return total


# -------------------------------------------------------------- contrast ---

PAIRS = [
    ("body text on background (light)", "#0F1B1E", "#F7F9FA", 4.5),
    ("muted text on background (light)", "#5A6B6F", "#F7F9FA", 4.5),
    ("faint text on surface (light)", "#84969A", "#FFFFFF", 3.0),
    ("white on brand button", "#FFFFFF", "#0E7C86", 4.5),
    ("dark text on amber button", "#20160A", "#F2A33C", 4.5),
    ("brand link on background (light)", "#0E7C86", "#F7F9FA", 4.5),
    ("danger text on background (light)", "#C22B2B", "#F7F9FA", 4.5),
    ("body text on surface (dark)", "#E8F1F2", "#131F22", 4.5),
    ("muted text on background (dark)", "#9BB0B4", "#0C1416", 4.5),
    ("brand link on background (dark)", "#3FB2BC", "#0C1416", 4.5),
    ("danger text on background (dark)", "#F26E6E", "#0C1416", 4.5),
    ("border against surface (light)", "#DCE4E6", "#FFFFFF", 1.2),
]


def luminance(hex_colour):
    r, g, b = (int(hex_colour[i : i + 2], 16) / 255 for i in (1, 3, 5))

    def channel(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = channel(r), channel(g), channel(b)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    lighter, darker = max(la, lb), min(la, lb)
    return (lighter + 0.05) / (darker + 0.05)


def check_contrast(verbose=False):
    if verbose:
        print("\nWCAG 2.1 contrast")
        print(f"  {'pair':<38} {'ratio':>7}  {'need':>5}  result")
    for label, fg, bg, required in PAIRS:
        ratio = contrast(fg, bg)
        ok = ratio >= required
        check(ok, f"contrast failure: {label} is {ratio:.2f}:1, needs {required}:1")
        if verbose:
            print(f"  {label:<38} {ratio:>6.2f}:1  {required:>4}:1  {'PASS' if ok else 'FAIL'}")


# ------------------------------------------------------------------ main ---

def check_listing_sync(manifest):
    """The manifest and the store listing must say the same thing.

    Chrome shows the manifest's name and description in the browser, and the
    listing's copy in the store. When they drift, users see two different
    products — and the drift is invisible until someone compares them by hand.
    """
    if not manifest:
        return

    text_dir = os.path.join(ROOT, "Store Upload", "Store Assets", "Text")
    pairs = [
        ("Store-Title.txt", manifest.get("name", ""), "name"),
        ("Short-Description.txt", manifest.get("description", ""), "description"),
    ]

    for filename, manifest_value, field in pairs:
        path = os.path.join(text_dir, filename)
        if not os.path.exists(path):
            check(False, f"listing asset missing: Store Assets/Text/{filename}", warn_only=True)
            continue
        listing_value = read(path).strip()
        check(
            listing_value == manifest_value,
            f"manifest {field} does not match {filename}\n"
            f"        manifest: {manifest_value!r}\n"
            f"        listing : {listing_value!r}",
        )


def main():
    verbose = "--contrast" in sys.argv

    print("Tabcove self-audit")
    print("=" * 60)

    manifest = check_manifest()
    check_listing_sync(manifest)
    check_network()
    check_unsafe()
    check_xss()
    check_assets(manifest)
    total = check_size()
    check_contrast(verbose)

    print(f"\n  version           {manifest.get('version') if manifest else '?'}")
    print(f"  permissions       {len((manifest or {}).get('permissions', []))}")
    print(f"  host permissions  {len((manifest or {}).get('host_permissions', []))}")
    print(f"  unpacked size     {total / 1024:.0f} KB")
    print(f"  checks run        {CHECKS}")

    if WARNINGS:
        print(f"\n  {len(WARNINGS)} warning(s):")
        for w in WARNINGS:
            print(f"    ! {w}")

    if ERRORS:
        print(f"\n  {len(ERRORS)} error(s):")
        for e in ERRORS:
            print(f"    x {e}")
        print("\nFAILED")
        return 1

    print("\nPASSED — ready to package")
    return 0


if __name__ == "__main__":
    sys.exit(main())
