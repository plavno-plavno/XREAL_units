#!/usr/bin/env python3
"""PreToolUse: deny file tools that touch paths outside the repo root.

Claude's own per-project memory dir and session scratch dir are allowed (harness internals).
"""
import json, os, sys

root = os.path.realpath(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())
allowed = [
    root,
    os.path.expanduser("~/.claude/projects/" + root.replace("/", "-").replace("_", "-")),
]
scratch_prefixes = ("/private/tmp/claude-", "/tmp/claude-")

data = json.load(sys.stdin)
ti = data.get("tool_input", {})
cands = [ti.get(k) for k in ("file_path", "path", "notebook_path")]
if data.get("tool_name") == "Glob":
    cands.append(ti.get("pattern"))

def inside(p):
    p = os.path.realpath(os.path.join(root, os.path.expanduser(p)))
    if p.startswith(scratch_prefixes):
        return True
    return any(p == a or p.startswith(a + os.sep) for a in allowed)

bad = [p for p in cands if isinstance(p, str) and p and not inside(p)]
if bad:
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason":
            f"Outside the workspace ({root}): {bad[0]}. Only this repo and its subfolders are allowed.",
    }}))
