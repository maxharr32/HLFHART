#!/usr/bin/env python3
"""
HLFHART — zero-dependency local server.

Serves the static site AND a real upload endpoint so the "backend form"
works end to end (no cloud hosting required, no database).

To use:
    cd /Users/max_harris/Documents/GitHub/HLFHART
    python3 scripts/serve.py

Then open http://localhost:8000/admin.html  (the Upload form).

It also serves the rest of the site (index.html, about.html, contact.html,
css/, js/, data/, art/).
"""

import base64
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
ART = REPO / "art"
DATA = REPO / "data" / "art.json"
UPLOADS_DIR = REPO / "uploads"
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}
CATEGORIES = ["biro portraits", "acrylic", "postcards", "life drawing", "collage", "sculpture"]

# Ensure directories exist
for d in [ART, UPLOADS_DIR, REPO / "data"]:
    d.mkdir(parents=True, exist_ok=True)

# Load existing manifest
def load_manifest():
    if DATA.exists():
        try:
            return json.loads(DATA.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"items": []}

def save_manifest(m):
    DATA.write_text(json.dumps(m, indent=2), encoding="utf-8")

def git(*args):
    return subprocess.run(["git", "-C", str(REPO)] + list(args),
                          capture_output=True, text=True)

def git_cmd_text(*args):
    r = git(*args)
    return (r.stdout or r.stderr or "").strip()

def git_commit_msg(*args):
    r = subprocess.run(["git", "-C", str(REPO)] + list(args),
                       capture_output=True, text=True)
    return (r.stdout or "").strip() or "(nothing staged)"

def safe_basename(name):
    """Collapse a filename to a safe single piece."""
    name = os.path.basename(name.replace("\\", "/"))
    name = re.sub(r"[^\w.\-]", "_", name).strip("._")
    return name or "art"

def unique_path(directory, name, ext):
    """Avoid overwriting an existing file."""
    candidate = directory / f"{name}{ext}"
    i = 1
    while candidate.exists():
        candidate = directory / f"{name[:-ext_len if False else 0]}_{i}{ext}"
        i += 1
    return candidate

class Handler(BaseHTTPRequestHandler):
    server_version = "HLFHART/1.0"

    # ---- helpers ----
    def _send(self, code, body, ctype="text/html; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def _serve_static(self, path):
        # map URL -> file
        if path in ("/", "/index.html"):
            f = REPO / "index.html"
        else:
            f = (REPO / path.lstrip("/")).resolve()
            # safety: stay inside REPO
            if not f.is_relative_to(REPO) if hasattr(f, "is_relative_to") else not str(f).startswith(str(REPO)):
                self._send(403, b"Forbidden")
                return
        if not f.exists():
            self._send(404, f"Not Found: {path}".encode())
            return
        # guess type
        ctype = "application/octet-stream"
        if f.suffix == ".html":
            ctype = "text/html; charset=utf-8"
        elif f.suffix == ".css":
            ctype = "text/css; charset=utf-8"
        elif f.suffix == ".js":
            ctype = "text/javascript; charset=utf-8"
        elif f.suffix == ".json":
            ctype = "application/json; charset=utf-8"
        elif f.suffix == ".svg":
            ctype = "image/svg+xml"
        elif f.suffix.lower() in ALLOWED_EXT:
            ctype = "image/" + f.suffix.lstrip(".")
        self._send(200, f.read_bytes(), ctype)

    # ---- routes ----
    def do_GET(self):
        p = self.path.split("?", 1)[0]
        if p.startswith("/api/"):
            self._send(405, b"Method Not Allowed")
            return
        self._serve_static(p)

    def do_POST(self):
        p = self.path.split("?", 1)[0]
        if p != "/api/upload":
            self._send(404, b"Not Found")
            return

        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length)
        try:
            body = json.loads(raw or b"{}")
        except Exception:
            self._send(400, b"Invalid JSON body")
            return

        title = (body.get("title") or "").strip()
        category = (body.get("category") or "").strip()
        description = (body.get("description") or "").strip()
        date = (body.get("date") or "").strip()
        filename = (body.get("filename") or "art.png")
        b64 = body.get("file_b64") or ""

        errors = []
        if not title: errors.append("title")
        if not category: errors.append("category")
        if not description: errors.append("description")
        if not b64: errors.append("file")
        if category not in CATEGORIES:
            errors.append("category")
        if errors:
            self._send(400, json.dumps({"error": f"Missing: {', '.join(errors)}"}).encode())
            return

        # category folder
        cat_dir = ART / category
        cat_dir.mkdir(parents=True, exist_ok=True)

        # decode
        try:
            raw_data = base64.b64decode(b64)
        except Exception:
            self._send(400, json.dumps({"error": "Could not decode image"}).encode())
            return
        if not raw_data:
            self._send(400, json.dumps({"error": "Empty file"}).encode())
            return

        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXT:
            ext = ".png"
        name = safe_basename("piece.")
        target = unique_path(cat_dir, name, ext)
        target.write_bytes(raw_data)

        # append to manifest
        m = load_manifest()
        item = {
            "id": f"{category.replace(' ', '-')}-{len(m['items'])+1:03d}",
            "title": title,
            "category": category,
            "date": date,
            "description": description,
            "filename": target.name,
            "image": f"art/{category}/{target.name}",
        }
        # de-dupe by title
        m["items"] = [x for x in m["items"] if x.get("title") != title]
        m["items"].insert(0, item)
        save_manifest(m)

        # git summary
        add = git_cmd_text("add", str(target))
        commit = git_cmd_text("commit", "-m", f"Add {title}")
        push = git_cmd_text("push", "origin", "main")
        cmd = f"cp '{target}' art/{category}/ && echo added && git add data/art.json {add} && git commit -m '{title}' && git push origin main"

        self._send(200, json.dumps({
            "ok": True,
            "command": cmd,
            "file": str(target.relative_to(REPO)),
            "category": str(cat_dir.relative_to(REPO)),
        }).encode())

    def log_message(self, format, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), format % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    # Try port 8000, bump if taken
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"HLFHART local server running at http://127.0.0.1:{port}")
    print("Open /admin.html to add your first piece.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")

if __name__ == "__main__":
    main()
