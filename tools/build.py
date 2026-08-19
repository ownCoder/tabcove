#!/usr/bin/env python3
"""Tabcove — build and package for the Chrome Web Store.

    python tools/build.py

The gate before anything is submitted. It refuses to produce a ZIP unless the
full self-audit passes, so a package can never be created from a state that
violates the guarantees in docs/compliance.md.

Steps:
  1. Run tools/validate.py           — manifest, permissions, network, XSS, assets
  2. Run node tools/test.mjs         — unit tests, if Node is available
  3. Check every required asset      — icons, screenshots, promo tiles, privacy docs
  4. Build release/tabcove-vX.Y.Z.zip from extension/ ONLY
  5. Copy it to Store Upload/Extension.zip
  6. Verify the ZIP's contents and its manifest version
"""

import json
import os
import shutil
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = os.path.join(ROOT, "extension")
RELEASE = os.path.join(ROOT, "release")
UPLOAD = os.path.join(ROOT, "Store Upload")
ASSETS = os.path.join(UPLOAD, "Store Assets")

# Files that must never end up inside the package, whatever else changes.
EXCLUDE_NAMES = {".DS_Store", "Thumbs.db", "desktop.ini", ".gitkeep"}
EXCLUDE_SUFFIXES = (".md", ".py", ".mjs", ".log", ".map", ".zip", ".psd", ".sketch")
EXCLUDE_DIRS = {"__pycache__", "node_modules", ".git", ".vscode", ".idea"}


def step(title):
    print(f"\n{title}")
    print("-" * 60)


def run(command, label):
    print(f"  running {label} …")
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, shell=False)
    if result.returncode != 0:
        print(result.stdout[-4000:])
        print(result.stderr[-2000:])
        return False
    # Show the tail, which carries the summary line.
    for line in result.stdout.strip().splitlines()[-4:]:
        print(f"    {line}")
    return True


def read_manifest():
    with open(os.path.join(EXT, "manifest.json"), encoding="utf-8") as f:
        return json.load(f)


def check_required_assets(version):
    """Everything the submission needs, verified to exist before packaging."""
    required = [
        (os.path.join(EXT, "icons", "icon16.png"), "extension icon 16"),
        (os.path.join(EXT, "icons", "icon32.png"), "extension icon 32"),
        (os.path.join(EXT, "icons", "icon48.png"), "extension icon 48"),
        (os.path.join(EXT, "icons", "icon128.png"), "extension icon 128"),
        (os.path.join(ASSETS, "Icons", "icon-128.png"), "store icon 128"),
        (os.path.join(ASSETS, "Promo", "promo-small-440x280.png"), "small promo tile"),
        (os.path.join(ASSETS, "Promo", "promo-marquee-1400x560.png"), "marquee promo tile"),
        (os.path.join(UPLOAD, "Privacy", "Privacy-Policy.md"), "privacy policy copy"),
        (os.path.join(UPLOAD, "Privacy", "Terms-of-Use.md"), "terms copy"),
        (os.path.join(UPLOAD, "Privacy", "Privacy-Policy-URL.txt"), "published policy URL"),
        (os.path.join(UPLOAD, "Upload Guide.md"), "upload guide"),
    ]

    missing = [label for path, label in required if not os.path.exists(path)]

    shots_dir = os.path.join(ASSETS, "Screenshots")
    shots = sorted(f for f in os.listdir(shots_dir) if f.endswith(".png")) if os.path.isdir(shots_dir) else []
    if len(shots) < 5:
        missing.append(f"at least 5 screenshots (found {len(shots)})")

    # The store rejects screenshots that are not exactly 1280x800 or 640x400.
    try:
        from PIL import Image

        for name in shots:
            with Image.open(os.path.join(shots_dir, name)) as img:
                if img.size not in ((1280, 800), (640, 400)):
                    missing.append(f"{name} is {img.width}x{img.height}, must be 1280x800")
    except ImportError:
        print("    ! Pillow not available — screenshot dimensions unverified")

    for label in missing:
        print(f"    x missing: {label}")

    if not missing:
        print(f"    all assets present ({len(shots)} screenshots at 1280x800)")
    return not missing


def should_include(path, name):
    if name in EXCLUDE_NAMES:
        return False
    if name.endswith(EXCLUDE_SUFFIXES):
        return False
    if name.startswith("."):
        return False
    return True


def build_zip(version):
    os.makedirs(RELEASE, exist_ok=True)
    zip_path = os.path.join(RELEASE, f"tabcove-v{version}.zip")

    if os.path.exists(zip_path):
        os.remove(zip_path)

    included = 0
    total_bytes = 0

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for base, dirs, files in os.walk(EXT):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for name in sorted(files):
                full = os.path.join(base, name)
                if not should_include(full, name):
                    print(f"    skipped {name}")
                    continue
                # Forward slashes and no leading directory: extension/ is the ZIP root.
                arcname = os.path.relpath(full, EXT).replace("\\", "/")
                archive.write(full, arcname)
                included += 1
                total_bytes += os.path.getsize(full)

    return zip_path, included, total_bytes


def verify_zip(zip_path, version):
    """Open the built ZIP and check it is loadable and correct."""
    with zipfile.ZipFile(zip_path) as archive:
        names = archive.namelist()

        bad = archive.testzip()
        if bad:
            print(f"    x corrupt entry: {bad}")
            return False

        if "manifest.json" not in names:
            print("    x manifest.json is not at the ZIP root")
            return False

        manifest = json.loads(archive.read("manifest.json"))
        if manifest["version"] != version:
            print(f"    x version mismatch: ZIP has {manifest['version']}, expected {version}")
            return False

        # Every path the manifest points at must be inside the ZIP.
        referenced = list(manifest.get("icons", {}).values())
        referenced.append(manifest["background"]["service_worker"])
        referenced.append(manifest["action"]["default_popup"])
        referenced.append(manifest["options_ui"]["page"])
        referenced += list(manifest["action"].get("default_icon", {}).values())

        for path in referenced:
            if path not in names:
                print(f"    x manifest references a file not in the ZIP: {path}")
                return False

        if manifest.get("default_locale") and "_locales/en/messages.json" not in names:
            print("    x default_locale is set but _locales/en/messages.json is missing")
            return False

        for name in names:
            if name.startswith("__MACOSX") or name.endswith(".DS_Store"):
                print(f"    x junk entry in ZIP: {name}")
                return False

        print(f"    {len(names)} entries, manifest v{manifest['version']}, all references resolve")
        return True


def main():
    print("Tabcove build")
    print("=" * 60)

    manifest = read_manifest()
    version = manifest["version"]
    print(f"  version {version}")

    step("1. Self-audit")
    if not run([sys.executable, os.path.join("tools", "validate.py")], "tools/validate.py"):
        print("\nFAILED — the self-audit did not pass. Nothing was packaged.")
        return 1

    step("2. Unit tests")
    node = shutil.which("node")
    if node:
        if not run([node, os.path.join("tools", "test.mjs")], "tools/test.mjs"):
            print("\nFAILED — unit tests did not pass. Nothing was packaged.")
            return 1
    else:
        print("    ! node not found — unit tests skipped")

    step("3. Required assets")
    if not check_required_assets(version):
        print("\nFAILED — submission assets are incomplete. Nothing was packaged.")
        return 1

    step("4. Package")
    zip_path, count, raw_bytes = build_zip(version)
    zipped = os.path.getsize(zip_path)
    print(f"    {count} files, {raw_bytes / 1024:.0f} KB raw -> {zipped / 1024:.0f} KB zipped")
    print(f"    {os.path.relpath(zip_path, ROOT)}")

    step("5. Verify the package")
    if not verify_zip(zip_path, version):
        print("\nFAILED — the built ZIP did not verify.")
        return 1

    step("6. Copy into Store Upload/")
    os.makedirs(UPLOAD, exist_ok=True)
    shutil.copy2(zip_path, os.path.join(UPLOAD, "Extension.zip"))
    shutil.copy2(os.path.join(EXT, "manifest.json"), os.path.join(ASSETS, "manifest-reference.json"))
    print("    Store Upload/Extension.zip")
    print("    Store Upload/Store Assets/manifest-reference.json")

    print("\n" + "=" * 60)
    print(f"PASSED - tabcove v{version} is ready to submit")
    print(f"  package   Store Upload/Extension.zip  ({zipped / 1024:.0f} KB)")
    print("  next      open 'Store Upload/Upload Guide.md' and follow it top to bottom")
    return 0


if __name__ == "__main__":
    sys.exit(main())
