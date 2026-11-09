---
name: export-guide
description: Bump a guide's manifest_version and regenerate its backend exports (data/guides/<guide>/manifest.json/.txt). Use after any change to data/guides/<guide>/manifest.js.
---

Guide: `$ARGUMENTS` (a folder name under `data/guides/`, e.g. `msi-claw-8-ai-plus`). If empty, list
`data/guides/*/manifest.js` and ask which one.

1. In `data/guides/<guide>/manifest.js`, bump `manifest_version` (format `YYYY-MM-DD.N`): if the date
   is today, increment `N`; otherwise set today's date with `.1`.
2. Run `python3 tools/export_manifest.py <guide>`. A JSON error means the manifest is no
   longer strict JSON after `window.GUIDE_MANIFEST = ` — fix it (quotes, trailing commas,
   comments) and re-run.
3. Show `git diff --stat data/guides/` and the new version. Do not commit unless asked.
