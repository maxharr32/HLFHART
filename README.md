# HLFHART — art portfolio

A showcase for HLFHART's original artwork. Categories: **biro portraits, acrylic, postcards, life drawing, collage, sculpture**.

Built with a little colour and a lot of motion. Article preview + short caption, filterable by category, in a Pinterest-style grid.

## Pages

| Page | Purpose |
| --- | --- |
| `index.html` | The gallery — masonry grid + category filters + lightbox. |
| `about.html` | Artist statement + the creator's story. |
| `contact.html` | Contact links (email / Instagram / delivery). |
| `admin.html` | The upload form (add a new piece). |
| `scripts/serve.py` | Zero-dependency local server with a real backend. |

---

## 1. Add a new piece (no coding)

There are two ways. Both do the same thing — move the image into the right folder and add a line to `data/art.json`.

### A) The web form (easiest)

1. Open a terminal in the HLFHART folder.
2. Start the local server:
   ```
   python3 scripts/serve.py
   ```
3. Open `http://localhost:8000/admin.html` in your browser.
4. Drag the picture into the box, fill in the title / category / description / date, and click **Add to portfolio**.
5. Copy the *three git commands* the page prints into Terminal, press Enter on each.
6. Refresh the live site.

### B) The terminal wizard (no server)

```
python3 scripts/upload_art.py --file ~/Desktop/art.jpg \
    --title "Morning hours" --category "acrylic" \
    --description "A soft wash..." --date 2026-06
```
Then run the three git commands it prints.

### What happens under the hood
- The image is moved into `art/<category>/`.
- A line is appended to `data/art.json` (the manifest the gallery reads).
- The form also supports drag-and-drop previews and auto-creates a **new category folder** if you type one that doesn't exist yet.

---

## 2. GitHub Pages setup

1. Push this repo to GitHub (it already has a `.git` ready).
2. In repo **Settings → Pages**, set **Source** to `Deploy from a branch` → `main` → `/ (root)`.
3. GitHub will publish your site at `https://<your-user>.github.io/HLFHART/`.

> Note: `admin.html` and `scripts/serve.py` run **only on your Mac** (localhost) and are not part of the published site — they're the "backend" that adds new art.

---

## 3. Folder layout

```
HLFHART/
├─ index.html          ← gallery (masonry + filters + lightbox)
├─ about.html          ← artist statement
├─ contact.html        ← contact links
├─ admin.html          ← upload form (run via serve.py)
├─ css/                ← styles (bold palette + animations)
├─ js/                 ← gallery + admin scripts
├─ data/
│  └─ art.json         ← manifest (the gallery's source of truth)
├─ art/
│  ├─ biro portraits/
│  ├─ acrylic/
│  ├─ postcards/
│  ├─ life drawing/
│  ├─ collage/
│  └─ sculpture/
└─ scripts/
   ├─ serve.py         ← local backend + upload endpoint
   └─ upload_art.py    ← CLI wizard version of the form
```

---

## 4. Adding more categories

Want to create a new medium (e.g. `printmaking`)? Just add it in one of two places:

1. **The form** — in `admin.html`, type the new category name in the Category dropdown
   (or create it in the wizard with a free-text answer). The script auto-creates the
   `art/<new category>/` folder.
2. **The code** — the gallery knows about six categories but can be told any more.
   Add the name to the `CATEGORIES` list in `scripts/serve.py` and `scripts/upload_art.py`
   (and the matching option in `admin.html`).

That's the whole trick — categories are just folder names + a manifest line.

---

## 5. Things to know

- The gallery's cards use a **vibrant gradient placeholder** so the grid never looks empty.
  Swap in the real picture files and the manifest entry's `filename`/`image` field points to
  `art/<category>/<file>`.
- Delete the piece later and its line will disappear from `data/art.json`.
- The site is fully mobile-friendly and has no dark-mode toggle or extra clutter — it's
  just the art, as requested.
