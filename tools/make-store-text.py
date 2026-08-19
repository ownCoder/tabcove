#!/usr/bin/env python3
"""Extract the Store Upload text assets from docs/store-listing.md.

    python tools/make-store-text.py

The listing copy has exactly one source of truth: docs/store-listing.md. This
script pulls the fenced blocks out of it and writes them as plain-text files
ready to paste into the Chrome Web Store form. Keeping them generated means the
document and the submission can never drift apart — a real risk when the same
paragraph is maintained in two places.

It also verifies the store's hard limits and fails if the copy exceeds them.
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "docs", "store-listing.md")
OUT = os.path.join(ROOT, "Store Upload", "Store Assets", "Text")

LIMITS = {
    "Store-Title.txt": 75,
    "Short-Description.txt": 132,
    "Long-Description.txt": 16000,
}


def fenced_blocks(markdown):
    """Every ``` fenced block, in document order."""
    return re.findall(r"```[a-z]*\n(.*?)```", markdown, re.DOTALL)


def main():
    if not os.path.exists(SOURCE):
        print(f"Missing {SOURCE}")
        return 1

    with open(SOURCE, encoding="utf-8") as f:
        markdown = f.read()

    blocks = fenced_blocks(markdown)
    if len(blocks) < 3:
        print("Expected at least 3 fenced blocks (title, short description, long description).")
        return 1

    os.makedirs(OUT, exist_ok=True)

    files = {
        "Store-Title.txt": blocks[0].strip(),
        "Short-Description.txt": blocks[1].strip(),
        "Long-Description.txt": blocks[2].strip("\n"),
    }

    # Keywords, category, and support answers are short enough to state here
    # rather than parsing them back out of prose.
    files["Keywords.txt"] = """Tabcove — keyword placement
===========================

The Chrome Web Store has no keyword field. Relevance comes from the title, the
short description, and the detailed description. These are the terms this
listing is written to rank for.

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

    files["Category-and-Metadata.txt"] = """Tabcove — listing metadata
==========================

Category            Productivity  ->  Workflow & Planning
Language            English (United Kingdom)
Pricing             Free
Contains ads        No
In-app purchases    No
Regions             All

Homepage URL        https://owncoder.github.io/tabcove/
Support URL         https://github.com/ownCoder/tabcove/issues
Privacy policy URL  https://owncoder.github.io/tabcove/privacy.html

SINGLE PURPOSE (paste into the Privacy tab)
Tabcove saves the tabs you have open into a local, searchable library, and
restores them later with their tab groups, pinned state, and window layout
intact. All data stays on the user's device.

DATA USE DECLARATIONS
  Personally identifiable information ......... No
  Health information .......................... No
  Financial and payment information ........... No
  Authentication information .................. No
  Personal communications ..................... No
  Location .................................... No
  Web history ................................. No
  User activity ............................... No
  Website content ............................. No

CERTIFICATIONS (tick all three)
  [x] I do not sell or transfer user data to third parties, outside of the
      approved use cases
  [x] I do not use or transfer user data for purposes that are unrelated to my
      item's single purpose
  [x] I do not use or transfer user data to determine creditworthiness or for
      lending purposes
"""

    files["Promotional-Text.txt"] = """Tabcove — promotional copy
==========================

SMALL TILE  440 x 280   (Store Assets/Promo/promo-small-440x280.png)
  Tabcove — Tab Manager & Session Saver
  Save every tab in one click
  and actually get them back.
  Restore points · Undo bin · Instant search
  100% local · No account · Free

MARQUEE  1400 x 560     (Store Assets/Promo/promo-marquee-1400x560.png)
  Tabcove — Tab Manager & Session Saver
  Save every tab in one click — and actually get them back.
  Restore points · 30-day undo bin · Instant search · Tab groups kept
  Everything stays on your device. No account, no sign-in, no network access.

ONE-LINER (Product Hunt, Reddit, social)
  The tab manager that doesn't lose your tabs. One click to save them all,
  instant search to find any of them, restore points and a 30-day undo bin so
  you always get them back. 100% local, no account, free.
"""

    files["Permissions-Justification.txt"] = """Tabcove — permission justifications
===================================

Paste each line into the matching field in the Chrome Web Store's permission
justification section.

tabs
  Required to read the title and URL of the user's open tabs so they can be
  saved, and to close them after they have been saved. Without this permission
  chrome.tabs.query returns tabs with no url or title, so a saved tab would be
  an empty entry. Also used to reopen saved tabs.

tabGroups
  Required to read the name, colour, and collapsed state of Chrome tab groups
  when saving, and to re-create them when restoring, so a restored collection
  keeps its original group structure instead of becoming a flat list.

storage
  Required to store the user's saved tab collections, settings, restore points,
  and undo bin on their own device.

unlimitedStorage
  Required because chrome.storage.local is capped at 10 MB without it. A user
  with a large library reaches that cap at roughly 25,000 saved tabs, after
  which writes begin to fail. This extension exists to keep saved tabs safe, so
  silently failing to save is the one outcome that must not happen.

contextMenus
  Required to add the right-click menu items "Stow all tabs in this window",
  "Stow just this tab", "Stow every other tab", and "Open Tabcove library".

favicon
  Required to display site icons next to saved tabs, read from Chrome's LOCAL
  favicon cache via the _favicon/ endpoint. This permission is specifically what
  allows the extension to avoid contacting a third-party favicon service, which
  would otherwise mean transmitting every saved URL to a remote server.

alarms
  Required for two periodic housekeeping tasks: sweeping items older than 30
  days out of the undo bin, and checking whether the library has grown enough
  since the last export to warrant a backup reminder. Manifest V3 terminates the
  service worker when idle, so setTimeout and setInterval cannot be used.

HOST PERMISSIONS
  None requested. The extension declares no host permissions and no content
  scripts, and therefore cannot read or modify any web page.

REMOTE CODE
  None. Every byte that executes is inside the package. The content security
  policy pins script-src to 'self', and the source contains no eval, no
  new Function, and no networking API of any kind.
"""

    files["Release-Notes.txt"] = """Tabcove 1.0.0 — first release
=============================

Save every tab in one click, find any of them in one second, and always get
them back.

  • Stow all tabs, this tab, other tabs, a selection, or every window
  • Instant ranked search across titles, addresses, and collection names
  • Chrome tab groups keep their names and colours through a full round trip
  • Restore points: an automatic snapshot before anything destructive
  • A 30-day undo bin, plus an undo toast on every destructive action
  • Restoring never empties your library
  • Export as JSON, HTML, Markdown, CSV, or plain text
  • Import from OneTab text, Tabcove JSON, or any list of addresses
  • Duplicate finder, backup reminders, and a live storage meter
  • Command palette on Ctrl/Cmd+K, and full keyboard operation
  • Light, dark, and system themes, with WCAG AA contrast

No account. No sign-in. No host permissions. No networking code at all.
"""

    failures = []
    for name, content in files.items():
        path = os.path.join(OUT, name)
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(content.rstrip() + "\n")

        limit = LIMITS.get(name)
        length = len(content.strip())
        if limit and length > limit:
            failures.append(f"{name} is {length} characters, limit is {limit}")
        suffix = f"  ({length}/{limit} chars)" if limit else ""
        print(f"  {name}{suffix}")

    if failures:
        print()
        for failure in failures:
            print(f"  x {failure}")
        return 1

    print(f"\n{len(files)} text assets written to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
