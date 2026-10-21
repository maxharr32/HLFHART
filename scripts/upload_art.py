#!/usr/bin/env python3
"""
HLFHART — one-command upload wizard (the "form on the back end" run from
the terminal). Zero dependencies.

How it works:
  1. You answer a few prompts (category, title, description, date).
  2. The image is moved into art/<category>/ and a line is appended to
     data/art.json.
  3. The script prints the exact git commands to save the piece to GitHub
     Pages.

Usage:
  python3 scripts/upload_art.py            # interactive prompts
  python3 scripts/upload_art.py --file img.jpg --title "Morning" \
      --category "acrylic" --desc "..." --date 2026-06

Tip: you can also drop a file onto the upload box in admin.html and it
prints the same thing.
"""

import base64
import json
import os
import shutil
import sys
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
ART = REPO / "art"
DATA = REPO / "data" / "art.json"
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}
CATEGORIES = ["biro portraits", "acrylic", "postcards", "life drawing", "collage", "sculpture"]

def ask(prompt, default=None):
    if default:
        line = input(f"{prompt} [{default}]: ").strip()
        return line or default
    line = input(f"{prompt}: ").strip()
    return line

def load_manifest():
    if DATA.exists():
        try:
            return json.loads(DATA.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"items": []}

def save_manifest(m):
    DATA.write_text(json.dumps(m, indent=2), encoding="utf-8")

def main():
    args = sys.argv[1:]

    # Option 1: interactive
    if args and args[0] == "--interactive" or (not any(a.startswith("--") for a in args)):
        print("== HLFHART upload ==")
        category = ask("Category", "biro portraits")
        if category not in CATEGORIES:
            print(f"  (new category '{category}' will be created for you)")
        fpath = ask("Image file path").strip()
        title = ask("Title", "Untitled")
        description = ask("Short description", "")
        d = ask("Date (YYYY-MM)", date.today().isoformat())[:10]
        # accept free-form date
        if len(d) == 7 and "-" in d:
            d = d.replace("-", "-")
        else:
            d = date.today().isoformat()
    else:
        # Option 2: flag-style
        def get(flag, default=None):
            i = args.index(flag) if flag in args else -1
            if i >= 0 and i + 1 < len(args):
                return args[i + 1]
            return default
        category = get("--category") or ask("Category", "biro portraits")
        fpath = get("--file")
        title = get("--title") or ask("Title", "Untitled")
        description = get("--desc") or get("--description") or ask("Short description", "")
        d = get("--date") or ask("Date (YYYY-MM)", date.today().isoformat())

    if not fpath:
        print("  No file given. Run: python3 scripts/upload_art.py --file <path>")
        sys.exit(1)

    ext = os.path.splitext(fpath)[1].lower()
    if ext not in ALLOWED_EXT:
        print(f"  Not an allowed image type: {ext or '(none)'}. Allowed: {', '.join(sorted(ALLOWED_EXT))}")
        sys.exit(1)
    if not Path(fpath).exists():
        print(f"  File not found: {fpath}")
        sys.exit(1)

    cat_dir = ART / category
    cat_dir.mkdir(parents=True, exist_ok=True)

    name = "piece"
    ext = os.path.splitext(fpath)[1].lower()
    target = cat_dir / (name + ext)
    # unique
    i = 1
    while target.exists():
        target = cat_dir / f"{name}_{i}{ext}"
        i += 1

    os.makedirs(cat_dir, exist_ok=True)
    shutil.move(fpath, target)

    m = load_manifest()
    item = {
        "id": f"{category.replace(' ', '-')}-{len(m['items'])+1:03d}",
        "title": title,
        "category": category,
        "date": d,
        "description": description,
        "filename": target.name,
        "image": f"art/{category}/{target.name}",
    }
    m["items"] = [x for x in m["items"] if x.get("title") != title]
    m["items"].insert(0, item)
    save_manifest(m)

    print(f"\n  ✔  Added: '{title}' → art/{category}/{target.name}")
    print(f"  ✔  Manifest updated: data/art.json")
    print("\n  Now save it to GitHub Pages:")
    print(f"    git add data/art.json art/{category}/{target.name}")
    print(f'    git commit -m "Add {title}"')
    print("    git push origin main")
    print("\n  Refresh https://hlfhart.github.io/HLFHART/ when done.")

if __name__ == "__main__":
    main()
