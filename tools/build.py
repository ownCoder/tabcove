#!/usr/bin/env python3
"""Tabcove - build and package for the Chrome Web Store.

    python tools/build.py

The gate before anything is submitted. It refuses to produce a ZIP unless the
full self-audit passes, so a package can never be created from a state that
violates the guarantees in docs/compliance.md.

Steps:
  1. Run tools/validate.py           - manifest, permissions, network, XSS, assets
  2. Run node tools/test.mjs         - unit tests, if Node is available
  3. Check every DASHBOARD FIELD has an answer  (see check_submission_surfaces)
  4. Build release/tabcove-vX.Y.Z.zip from extension/ ONLY
  5. Copy it to Store Upload/Extension.zip
  6. Verify the ZIP's contents and its manifest version
"""

import json
import os
import re
import shutil
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = os.path.join(ROOT, "extension")
RELEASE = os.path.join(ROOT, "release")
UPLOAD = os.path.join(ROOT, "Store Upload")

# Files that must never end up inside the package, whatever else changes.
EXCLUDE_NAMES = {".DS_Store", "Thumbs.db", "desktop.ini", ".gitkeep"}
EXCLUDE_SUFFIXES = (".md", ".py", ".mjs", ".log", ".map", ".zip", ".psd", ".sketch")
EXCLUDE_DIRS = {"__pycache__", "node_modules", ".git", ".vscode", ".idea"}


def step(title):
    print(f"\n{title}")
    print("-" * 60)


def run(command, label):
    print(f"  running {label} ...")
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, shell=False)
    if result.returncode != 0:
        print(result.stdout[-4000:])
        print(result.stderr[-2000:])
        return False
    for line in result.stdout.strip().splitlines()[-4:]:
        print(f"    {line}")
    return True


def read_manifest():
    with open(os.path.join(EXT, "manifest.json"), encoding="utf-8") as f:
        return json.load(f)


# --------------------------------------------------- submission completeness ---

def check_submission_surfaces():
    """Verify every DASHBOARD FIELD has an answer - not that a file list exists.

    This inversion is the root fix for the defect that started this work. The
    previous version walked a hand-written list of paths, so it could only detect
    the absence of something a human had already remembered to name. The "single
    purpose" statement was reported missing precisely because nobody had added it
    to that list - and by the same mechanism "Contains ads", "In-app purchases",
    the 5-screenshot cap, and the entire Account surface were missing too.

    Now each surface under Store Upload/ carries a fields.json enumerating every
    field that surface actually presents, and this walks THOSE. The question the
    build asks changes from "did someone remember this file?" to "does every
    field on this surface have an answer?" - which is the question the submitter
    is already asking when they open the folder.
    """
    surfaces = sorted(
        d for d in os.listdir(UPLOAD)
        if os.path.isdir(os.path.join(UPLOAD, d)) and re.match(r"^\d+-", d)
    )
    if not surfaces:
        print("    x no dashboard surfaces found under Store Upload/")
        return False

    problems = []
    total_fields = 0

    for surface in surfaces:
        base = os.path.join(UPLOAD, surface)
        manifest_path = os.path.join(base, "fields.json")

        if not os.path.exists(manifest_path):
            problems.append(f"{surface}/ has no fields.json - its fields cannot be checked")
            continue

        with open(manifest_path, encoding="utf-8") as f:
            spec = json.load(f)

        if not os.path.exists(os.path.join(base, "_Answers.md")):
            problems.append(f"{surface}/_Answers.md is missing - no entry point for this surface")

        answered = 0
        for field in spec["fields"]:
            total_fields += 1
            answer = field.get("answer", "")

            if not answer:
                if field.get("required", False):
                    problems.append(f"{spec['surface']} -> '{field['field']}' has no answer at all")
                continue

            # A file answer must resolve. An in-document anchor (file.md#3) is
            # satisfied by the document existing, which is checked above.
            if "#" not in answer:
                target = os.path.normpath(os.path.join(base, answer))
                if not os.path.exists(target):
                    problems.append(
                        f"{spec['surface']} -> '{field['field']}' points at a missing answer: {answer}"
                    )
                    continue
            answered += 1

        print(f"    {spec['surface']:<14} {answered}/{len(spec['fields'])} fields answered")

    # ---- Screenshots: the store accepts a MAXIMUM of five ------------------
    shots_dir = os.path.join(UPLOAD, "2-Store-listing", "Screenshots")
    shots = sorted(f for f in os.listdir(shots_dir) if f.endswith(".png")) if os.path.isdir(shots_dir) else []

    if not shots:
        problems.append("no screenshots staged - the store requires at least 1")
    if len(shots) > 5:
        problems.append(
            f"{len(shots)} screenshots staged, but the store accepts a maximum of 5 - "
            "move the surplus into 2-Store-listing/Extras/"
        )
    if shots and not shots[0].startswith("01-"):
        problems.append("the hero screenshot must sort first (01-...); it is shown largest")

    try:
        from PIL import Image

        for name in shots:
            with Image.open(os.path.join(shots_dir, name)) as img:
                if img.size not in ((1280, 800), (640, 400)):
                    problems.append(f"{name} is {img.width}x{img.height}; must be 1280x800 or 640x400")
    except ImportError:
        print("    ! Pillow not available - screenshot dimensions unverified")

    # ---- Every declared permission needs a written justification -----------
    declared = read_manifest().get("permissions", [])
    just_path = os.path.join(UPLOAD, "3-Privacy", "Permissions-Justification.txt")
    if os.path.exists(just_path):
        with open(just_path, encoding="utf-8") as f:
            justifications = f.read()
        for permission in declared:
            if permission not in justifications:
                problems.append(f"the '{permission}' permission has no justification text")
    else:
        problems.append("3-Privacy/Permissions-Justification.txt is missing")

    # ---- The data-usage answer must match what the code actually stores ----
    usage_path = os.path.join(UPLOAD, "3-Privacy", "Data-Usage-Declarations.txt")
    if os.path.exists(usage_path):
        with open(usage_path, encoding="utf-8") as f:
            usage = f.read()
        # Tabcove stores saved tab URLs, titles, and save times. Google's User
        # Data FAQ requires local-only handling to be disclosed, so Web history
        # must be ticked. Under-declaring here is the most damaging mistake
        # available on the Privacy tab: it is a false statement a reviewer can
        # check against the listing's own description.
        if "[x] Web history" not in usage:
            problems.append(
                "Data-Usage-Declarations.txt does not tick Web history - Tabcove stores "
                "saved tab URLs and titles, and local-only storage still requires disclosure"
            )
    else:
        problems.append("3-Privacy/Data-Usage-Declarations.txt is missing")

    if not os.path.exists(os.path.join(UPLOAD, "Upload Guide.md")):
        problems.append("Upload Guide.md is missing")

    for problem in problems:
        print(f"    x {problem}")

    if not problems:
        print(
            f"    {total_fields} dashboard fields answered across {len(surfaces)} surfaces | "
            f"{len(shots)}/5 screenshots | {len(declared)} permissions justified"
        )
    return not problems


# ------------------------------------------------------------------ package ---

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
        print("\nFAILED - the self-audit did not pass. Nothing was packaged.")
        return 1

    step("2. Unit tests")
    node = shutil.which("node")
    if node:
        if not run([node, os.path.join("tools", "test.mjs")], "tools/test.mjs"):
            print("\nFAILED - unit tests did not pass. Nothing was packaged.")
            return 1
    else:
        print("    ! node not found - unit tests skipped")

    step("3. Submission surfaces - does every dashboard field have an answer?")
    if not check_submission_surfaces():
        print("\nFAILED - the package does not answer every dashboard field.")
        return 1

    step("4. Package")
    zip_path, count, raw_bytes = build_zip(version)
    zipped = os.path.getsize(zip_path)
    print(f"    {count} files, {raw_bytes / 1024:.0f} KB raw -> {zipped / 1024:.0f} KB zipped")
    print(f"    {os.path.relpath(zip_path, ROOT)}")

    step("5. Verify the package")
    if not verify_zip(zip_path, version):
        print("\nFAILED - the built ZIP did not verify.")
        return 1

    step("6. Copy into Store Upload/")
    os.makedirs(UPLOAD, exist_ok=True)
    shutil.copy2(zip_path, os.path.join(UPLOAD, "Extension.zip"))
    shutil.copy2(
        os.path.join(EXT, "manifest.json"),
        os.path.join(UPLOAD, "1-Package", "manifest-reference.json"),
    )
    print("    Store Upload/Extension.zip")
    print("    Store Upload/1-Package/manifest-reference.json")

    print("\n" + "=" * 60)
    print(f"PASSED - tabcove v{version} is ready to submit")
    print(f"  package   Store Upload/Extension.zip  ({zipped / 1024:.0f} KB)")
    print("  next      open 'Store Upload/Upload Guide.md' and follow it top to bottom")
    return 0


if __name__ == "__main__":
    sys.exit(main())
