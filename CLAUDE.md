# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace boundary

This repo root is the ONLY workspace. Descend into subfolders freely, but never read, write, list,
`cd` into or run anything above it — no sibling repos (e.g. `XREAL_Ktranslator`), no home dir.
Pass this rule on to every subagent. Docs referenced in comments but absent here
(`GUIDE_COMMANDS.md`, `документы/…`) are out of reach — ask the user instead.

## What this is

Static site for XREAL One glasses: home page (`index.html`) linking a QR bench (`qr.html` +
unit pages) and voice-driven device guides. Plain HTML/CSS/JavaScript only — no TypeScript,
frameworks, bundlers or package manager; no build, files deploy as-is. The `~/AGENTS.md`
(Next.js/pnpm/Tailwind/Jest) does NOT apply here.

```
index.html, qr.html        pages
equipment/EQ-*.html        unit pages      ← URLs are printed in QR codes: never move/rename
guides/<guide>.html        guide pages     ← URL is in the manifest sent to the backend: never move
assets/css/common.css      shared tokens (light/dark) + base rules for home, bench, unit pages
assets/js/vendor/          third-party JS (qrcode-generator 1.4.4) — never edit
assets/images/guides/<guide>/   guide view images
data/guides/<guide>/       manifest.js (source of truth) + exported manifest.json/.txt
tools/export_manifest.py   manifest exporter (stdlib Python)
```

New files go into this structure (images → `assets/images/…`, PDFs → `assets/docs/…`, data →
`data/…`). Paths are relative, so pages also work from `file://`.

- **Everything is in English** — UI text, data values, comments, docs (`lang="en"`). The user
  writes in Russian; still produce English pages.
- Live host is Vercel: `https://xreal-units.vercel.app/`. The `PAGES` constant in `qr.html`
  still says GitHub Pages (file:// fallback) — ask before changing it.
- Page-specific CSS/JS stays inline in each page; only shared tokens live in `common.css`
  (guide pages have their own black glasses design and don't use it). 2-space indent. Keep a
  file's JS style: `index.html`/`qr.html` are ES5 (`var`, `function`); guide pages are ES2015+.
- Unit IDs match `EQ-\d{3,}`; a unit = `equipment/<id>.html` + an entry in `UNITS` in `qr.html`
  + a link on `index.html`. A new guide also needs a `.guide` card on `index.html`.
- QR payloads are bare URLs — never include the `[glasses] QR scanned: url=` prefix (the app adds it).

## Guides

- `data/guides/<guide>/manifest.js` is the source of truth. Everything after
  `window.GUIDE_MANIFEST = ` must stay **strict JSON** (double quotes, no comments, no trailing
  commas) — the Python exporter parses it without a JS engine. View `image` paths are relative
  to the guide page (`../assets/images/guides/<guide>/…`).
- After any manifest change: bump `manifest_version` (`YYYY-MM-DD.N`), then run
  `python3 tools/export_manifest.py <guide>` (or `/export-guide`).
- Glasses constraints: fixed 1781×879 stage, black background (black renders transparent),
  nothing may require scrolling (the WebView doesn't scroll).
- Debugging: `?debug=1` (or Ctrl+Shift+D / 5 clicks on logo) opens the test panel, `?host=sim`
  simulates the glasses host, `?cmd=<json>` runs commands on load. Progress persists in
  localStorage under `guide:<guide_id>`.

## Git

Never commit `.DS_Store` or `.idea/` (both gitignored).
