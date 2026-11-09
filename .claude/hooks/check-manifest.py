#!/usr/bin/env python3
"""PostToolUse: after editing data/guides/*/manifest.js, verify the body is strict JSON."""
import json, re, sys

data = json.load(sys.stdin)
f = data.get("tool_input", {}).get("file_path") or ""
if not re.search(r"/data/guides/[^/]+/manifest\.js$", f):
    sys.exit(0)
PREFIX = "window.GUIDE_MANIFEST = "
try:
    src = open(f, encoding="utf-8").read()
    json.loads(src[src.index(PREFIX) + len(PREFIX):].strip().rstrip(";"))
except Exception as e:
    print(json.dumps({"decision": "block", "reason":
        f"{f} is no longer strict JSON after '{PREFIX}' (export_manifest.py will fail): {e}"}))
    sys.exit(0)
print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext":
    "Manifest is valid JSON. Remember: bump manifest_version and run /export-guide."}}))
