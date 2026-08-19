#!/usr/bin/env python3
"""Generate the Store Upload text assets, organised BY DASHBOARD TAB.

    python tools/make-store-text.py

Two rules govern this script, both learned the hard way.

1. ONE SOURCE OF TRUTH.
   The listing copy lives in docs/store-listing.md and nowhere else. The fenced
   blocks are extracted from it, so the document and the submission cannot drift.

2. FILED BY TAB, NOT BY ASSET TYPE.
   The original layout grouped everything under "Store Assets/Text/", including
   the single purpose statement and the permission justifications — which are
   Privacy-tab fields. A submitter working the Privacy tab opened Privacy/,
   found only the policy documents, and correctly reported the single purpose as
   missing. Files now live in the folder matching the dashboard tab that asks
   for them:

       Store Assets/Text/   ->  Store listing tab, and Distribution tab
       Privacy/             ->  Privacy tab

   Privacy-tab content is authored in Store Upload/Privacy/ directly, because it
   is long-form and reviewer-facing. This script VERIFIES those files exist and
   that their key strings match the manifest, rather than overwriting them.

The script also enforces the store's hard character limits and fails on breach.
"""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "docs", "store-listing.md")
MANIFEST = os.path.join(ROOT, "extension", "manifest.json")
UPLOAD = os.path.join(ROOT, "Store Upload")
TEXT = os.path.join(UPLOAD, "Store Assets", "Text")
PRIVACY = os.path.join(UPLOAD, "Privacy")

LIMITS = {
    "Store-Title.txt": 75,
    "Short-Description.txt": 132,
    "Long-Description.txt": 16000,
}

# Privacy-tab files are authored by hand, not generated — but they must exist,
# and they must carry the strings below or a submitter will paste the wrong text.
PRIVACY_REQUIRED = {
    "Privacy-Tab-Answers.md": [
        "Single purpose",
        "Permission justifications",
        "Are you using remote code?",
        "Privacy policy URL",
    ],
    "Single-Purpose.txt": ["Tabcove saves the tabs you have open"],
    "Permissions-Justification.txt": [
        "tabs", "tabGroups", "storage", "unlimitedStorage",
        "contextMenus", "favicon", "alarms",
    ],
    "Data-Usage-Declarations.txt": ["Tick NONE", "Tick ALL THREE"],
    "Privacy-Policy-URL.txt": ["https://owncoder.github.io/tabcove/privacy.html"],
    "Privacy-Policy.md": ["Effective date"],
    "Terms-of-Use.md": ["Effective date"],
}


def fenced_blocks(markdown):
    """Every ``` fenced block, in document order."""
    return re.findall(r"```[a-z]*\n(.*?)```", markdown, re.DOTALL)


def write(directory, name, content):
    path = os.path.join(directory, name)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content.rstrip() + "\n")
    return path


def main():
    if not os.path.exists(SOURCE):
        print(f"Missing {SOURCE}")
        return 1

    with open(SOURCE, encoding="utf-8") as f:
        markdown = f.read()
    with open(MANIFEST, encoding="utf-8") as f:
        manifest = json.load(f)

    blocks = fenced_blocks(markdown)
    if len(blocks) < 3:
        print("Expected at least 3 fenced blocks in docs/store-listing.md "
              "(title, short description, long description).")
        return 1

    os.makedirs(TEXT, exist_ok=True)
    os.makedirs(PRIVACY, exist_ok=True)

    failures = []

    # ---------------------------------------------------- Store listing tab ---

    listing = {
        "Store-Title.txt": blocks[0].strip(),
        "Short-Description.txt": blocks[1].strip(),
        "Long-Description.txt": blocks[2].strip("\n"),
    }

    listing["Keywords.txt"] = """Tabcove - keyword placement
===========================

Reference only. The Chrome Web Store has no keyword field; relevance comes from
the title, the short description, and the detailed description. These are the
terms this listing is written to rank for.

PRIMARY (in the title and the first 150 characters)
  tab manager
  session saver
  save tabs
  tab groups

SECONDARY (placed naturally in the detailed description)
  restore tabs, tab organizer, session manager, save all tabs,
  reduce tab clutter, chrome memory, tab backup, restore session,
  tab list, bookmark alternative, close tabs and save, tab search,
  tab groups backup, local tab manager, no account tab manager,
  privacy tab manager, export tabs

LONG-TAIL INTENT
  save all my tabs chrome extension
  tab manager that doesn't lose tabs
  save chrome tab groups extension
  chrome using too much memory tabs
  tab manager no account
  export chrome tabs to a file

AVOIDED ON PURPOSE
  Competitor brand names in the title or as standalone keywords
  Superlatives ("best", "#1", "the only")
  Claims the product cannot back ("AI-powered", "cloud sync")
  Repeated or invisible keyword blocks
"""

    # NOTE: single purpose and data-usage answers are NOT in this file. They are
    # Privacy-tab fields and live in Store Upload/Privacy/. Keeping a second copy
    # here is what caused them to drift out of sight in the first place.
    listing["Category-and-Metadata.txt"] = """Tabcove - Store listing and Distribution metadata
=================================================

Everything the STORE LISTING tab and the DISTRIBUTION tab ask for.

  >> Privacy tab fields are NOT here. They are in Store Upload/Privacy/,
  >> starting with Privacy/Privacy-Tab-Answers.md.


STORE LISTING TAB
-----------------

  Title               Store Assets/Text/Store-Title.txt
  Summary             Store Assets/Text/Short-Description.txt
  Description         Store Assets/Text/Long-Description.txt
  Category            Productivity  ->  Workflow & Planning
  Language            English (United Kingdom)

  Store icon          taken from the ZIP automatically (128 px)
                      spare: Store Assets/Icons/icon-128.png
  Screenshots         Store Assets/Screenshots/  -- all 8, filename order,
                      01-library.png first
  Small promo tile    Store Assets/Promo/promo-small-440x280.png
  Marquee promo tile  Store Assets/Promo/promo-marquee-1400x560.png

  Official URL        https://owncoder.github.io/tabcove/
  Homepage URL        https://owncoder.github.io/tabcove/
  Support URL         https://github.com/ownCoder/tabcove/issues
  Mature content      No


DISTRIBUTION TAB
----------------

  Visibility          Public
  Pricing             Free
  Regions             All
  Trader status       Non-trader
                      Nothing is monetised in this version: no payments, no
                      subscriptions, no in-app purchases, no ads, no affiliate
                      links. Revisit this when Pro ships in 2.0.0.


PRIVACY TAB  ->  see Store Upload/Privacy/Privacy-Tab-Answers.md
---------------------------------------------------------------

  Single purpose             Privacy/Single-Purpose.txt
  Permission justifications  Privacy/Permissions-Justification.txt
  Remote code                Privacy/Privacy-Tab-Answers.md   (answer: No)
  Data usage + certifications Privacy/Data-Usage-Declarations.txt
  Privacy policy URL         Privacy/Privacy-Policy-URL.txt
"""

    listing["Promotional-Text.txt"] = """Tabcove - promotional copy
==========================

SMALL TILE  440 x 280   (Store Assets/Promo/promo-small-440x280.png)
  Tabcove - Tab Manager & Session Saver
  Save every tab in one click
  and actually get them back.
  Restore points - Undo bin - Instant search
  100% local - No account - Free

MARQUEE  1400 x 560     (Store Assets/Promo/promo-marquee-1400x560.png)
  Tabcove - Tab Manager & Session Saver
  Save every tab in one click - and actually get them back.
  Restore points - 30-day undo bin - Instant search - Tab groups kept
  Everything stays on your device. No account, no sign-in, no network access.

ONE-LINER (Product Hunt, Reddit, social)
  The tab manager that doesn't lose your tabs. One click to save them all,
  instant search to find any of them, restore points and a 30-day undo bin so
  you always get them back. 100% local, no account, free.
"""

    listing["Release-Notes.txt"] = """Tabcove 1.0.0 - first release
=============================

Save every tab in one click, find any of them in one second, and always get
them back.

  - Stow all tabs, this tab, other tabs, a selection, or every window
  - Instant ranked search across titles, addresses, and collection names
  - Chrome tab groups keep their names and colours through a full round trip
  - Restore points: an automatic snapshot before anything destructive
  - A 30-day undo bin, plus an undo toast on every destructive action
  - Restoring never empties your library
  - Export as JSON, HTML, Markdown, CSV, or plain text
  - Import from OneTab text, Tabcove JSON, or any list of addresses
  - Duplicate finder, backup reminders, and a live storage meter
  - Command palette on Ctrl/Cmd+K, and full keyboard operation
  - Light, dark, and system themes, with WCAG AA contrast

No account. No sign-in. No host permissions. No networking code at all.
"""

    print("Store listing tab  ->  Store Assets/Text/")
    for name, content in listing.items():
        write(TEXT, name, content)
        limit = LIMITS.get(name)
        length = len(content.strip())
        if limit and length > limit:
            failures.append(f"{name} is {length} characters, limit is {limit}")
        suffix = f"  ({length}/{limit} chars)" if limit else ""
        print(f"  {name}{suffix}")

    # ------------------------------------------------ manifest / listing sync ---

    if listing["Store-Title.txt"] != manifest.get("name"):
        failures.append("Store-Title.txt does not match manifest name")
    if listing["Short-Description.txt"] != manifest.get("description"):
        failures.append("Short-Description.txt does not match manifest description")

    # -------------------------------------------------------- Privacy tab ---

    print("\nPrivacy tab  ->  Privacy/  (authored, verified here)")
    declared = set(manifest.get("permissions", []))

    for name, needles in PRIVACY_REQUIRED.items():
        path = os.path.join(PRIVACY, name)
        if not os.path.exists(path):
            failures.append(f"Privacy/{name} is missing")
            print(f"  x {name}  MISSING")
            continue

        with open(path, encoding="utf-8") as f:
            body = f.read()

        absent = [n for n in needles if n not in body]
        if absent:
            failures.append(f"Privacy/{name} does not mention: {', '.join(absent)}")
            print(f"  x {name}  missing: {', '.join(absent)}")
        else:
            print(f"  {name}")

    # Every declared permission must be justified somewhere in Privacy/.
    just_path = os.path.join(PRIVACY, "Permissions-Justification.txt")
    if os.path.exists(just_path):
        with open(just_path, encoding="utf-8") as f:
            justifications = f.read()
        unjustified = [p for p in declared if p not in justifications]
        if unjustified:
            failures.append(
                f"permissions with no justification text: {', '.join(sorted(unjustified))}"
            )
        else:
            print(f"  all {len(declared)} declared permissions have a justification")

    # ------------------------------------------------------------- result ---

    if failures:
        print()
        for failure in failures:
            print(f"  x {failure}")
        print("\nFAILED")
        return 1

    print(f"\n{len(listing)} listing assets written, "
          f"{len(PRIVACY_REQUIRED)} privacy assets verified")
    return 0


if __name__ == "__main__":
    sys.exit(main())
