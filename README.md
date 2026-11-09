# XREAL_units

Static pages for XREAL One glasses: a QR bench for testing the glasses' scanner (unit tags plus
the unit pages they open) and interactive device guides driven by voice.

```
index.html                     home: links to both sections
qr.html                        bench: QR tags, resolver edge cases, workbench
equipment/EQ-1001.html         Centrifugal pump P-12
equipment/EQ-1002.html         Air compressor AC-3
equipment/EQ-1003.html         HVAC air handler AHU-7
equipment/EQ-1004.html         Forklift charger FC-2
guides/msi-claw-8-ai-plus.html interactive device guide for XREAL One Pro
assets/css/common.css          shared colours, fonts and base styles
assets/js/vendor/qrcode.js     qrcode-generator 1.4.4 (MIT), so the bench works offline
assets/images/guides/          guide images
data/guides/                   guide manifests (manifest.js + exported .json/.txt for the backend)
tools/export_manifest.py       python3 tools/export_manifest.py <guide>
```

## How it works

- Each QR code holds a link to a unit page: `<bench address>/equipment/<id>.html`.
  The address is taken from wherever `qr.html` is opened, so on the live host the codes
  point at the real pages. A bench opened from disk (`file://`) falls back to the Pages
  address — `https://plavno-plavno.github.io/XREAL_units/`.
- After a scan the app sends
  `{"commandName":"sendTextCommand","text":"[glasses] QR scanned: url=<code contents>"}`.
  The app adds the prefix; it must not be in the code itself.
- Resolver (the bench has a copy of the server one): exact match against a registry link
  first, then `EQ-\d{3,}` anywhere in the string, otherwise `equipment_id: null` and the
  name from the last path segment.

## Hosting

Live at `https://xreal-units.vercel.app/`. GitHub Pages also works:
Settings → Pages → Deploy from a branch → `main` / `/ (root)`.
Static, no build; the only external dependency is Google Fonts — without it the pages
fall back to system fonts.
