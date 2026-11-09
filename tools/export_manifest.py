#!/usr/bin/env python3
"""Writes a guide's manifest out for the backend, next to its page.

    python3 tools/export_manifest.py msi-claw-8-ai-plus

data/guides/<guide>/manifest.js is the source of truth (guides/<guide>.html loads it as a script,
which also works from file://). This writes, next to it:

    data/guides/<guide>/manifest.json  the same data as JSON
    data/guides/<guide>/manifest.txt   a compact plain-text digest: ids, names and the `say` lines

Run it after every change to the manifest, and bump manifest_version first.
"""

import json
import pathlib
import sys

GUIDES = pathlib.Path(__file__).resolve().parent.parent / "data" / "guides"
PREFIX = "window.GUIDE_MANIFEST = "


def load(guide):
    src = (GUIDES / guide / "manifest.js").read_text(encoding="utf-8")
    body = src[src.index(PREFIX) + len(PREFIX):].strip().rstrip(";")
    return json.loads(body)


def digest(m):
    d = m["device"]
    out = [
        f"Guide {m['guide_id']} · manifest {m['manifest_version']} · protocol {m['protocol']}",
        f"{d['name']} ({d['model']} {d['variant']}), {d['kind']}, {d['os']}",
        f"URL: {m['url']}",
        "",
        "Commands: " + ", ".join(m["commands"]),
        "",
        "Sections (id — title — kind):",
    ]
    for s in m["sections"]:
        out.append(f"  {s['id']} — {s['title']} — {len(s['items'])} {s['kind']}")
        for it in s["items"]:
            out.append(f"    {it['n']} {it['id']}: {it['say']}")
    out += ["", "Views: " + ", ".join(v["id"] for v in m["views"]), "", "Parts (id — name — view — say):"]
    for p in m["parts"]:
        out.append(f"  {p['id']} — {p['name']} — {p['view']} #{p['number']} — {p['say']}")
    out += ["", "Lights:"]
    out += [f"  {l['id']}: {l['meaning']}" for l in m["leds"]]
    out += ["", "Stick colours (InfoMode):"]
    out += [f"  {c['id']}: {c['mode']}" for c in m["mode_colors"]]
    out += ["", "Notes:"]
    out += [f"  {n['id']} ({n['severity']}): {n['text']}" for n in m["notes"]]
    return "\n".join(out) + "\n"


def main():
    guide = sys.argv[1] if len(sys.argv) > 1 else "msi-claw-8-ai-plus"
    m = load(guide)
    (GUIDES / guide / "manifest.json").write_text(json.dumps(m, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (GUIDES / guide / "manifest.txt").write_text(digest(m), encoding="utf-8")
    print(f"{guide}: {len(m['sections'])} sections, {len(m['parts'])} parts, manifest {m['manifest_version']}")


if __name__ == "__main__":
    main()
