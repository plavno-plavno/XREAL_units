---
name: new-unit
description: Add a new equipment unit (EQ-XXXX) to the QR bench — creates equipment/<id>.html and registers it in UNITS in qr.html and links it from index.html.
disable-model-invocation: true
---

Unit: `$ARGUMENTS` (id must match `EQ-\d{3,}`). Ask for anything missing: name, kind, where,
doc, cycle (e.g. "Monthly"), range.

1. Copy the closest existing `equipment/EQ-*.html` to `equipment/<id>.html` and replace its
   content. Keep it CSS-only (no `<script>`), English text, same structure and styles.
2. Append an entry to `var UNITS = [...]` in `qr.html` with the same fields as existing
   entries (`id, name, kind, where, doc, cycle, range`). ES5 syntax only. Add an `<a>` to `.units` on `index.html` and to the
   `dev-nav` link row of the other unit pages.
3. Remind the user that the assistant's backend `data.json` registry must get the same unit —
   it is not in this repo.
