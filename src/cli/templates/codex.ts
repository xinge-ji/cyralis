import { hostSkillTemplates } from "./feature-skills.js";

const codexConfig = `# Project-scoped Codex defaults for Cyralis.

# hooks.json is loaded by Codex only when hooks are enabled in user config and
# approved by the user.
`;

const codexHooks = `{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 -X utf8 .codex/hooks/inject-context-memory.py",
            "timeout": 10
          }
        ]
      }
    ]
  }
}`;

const codexHook = `#!/usr/bin/env python3
"""Emit a compact Cyralis breadcrumb for Codex per-turn hooks."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path


def find_root(start: Path) -> Path | None:
    cur = start.resolve()
    while cur != cur.parent:
        if (cur / ".cyralis").is_dir():
            return cur
        cur = cur.parent
    return None


def read_hook_input() -> dict:
    try:
        value = json.load(sys.stdin)
    except Exception:
        return {}
    return value if isinstance(value, dict) else {}


def sanitize_key(raw: str) -> str:
    value = re.sub(r"[^A-Za-z0-9_.-]+", "-", raw.strip())
    return value.strip("-._") or "session"


def context_key(data: dict) -> str | None:
    for key in ("session_id", "conversation_id", "thread_id", "transcript_path"):
        value = data.get(key)
        if isinstance(value, str) and value:
            return sanitize_key(value)
    for key in ("CYRALIS_CONTEXT_ID", "CODEX_SESSION_ID", "CODEX_CONVERSATION_ID", "SESSION_ID"):
        value = os.environ.get(key)
        if value:
            return sanitize_key(value)
    return None


def print_workflow_state(root: Path, key: str | None) -> None:
    helper = root / ".cyralis" / "tools" / "work.py"
    if not helper.is_file():
        print("<workflow-state>")
        print("Status: no_task")
        print("Cyralis workflow helper missing; run cyralis init/update to install .cyralis/tools/work.py.")
        print("</workflow-state>")
        return

    cmd = [sys.executable, "-X", "utf8", str(helper), "--cwd", str(root)]
    if key:
        cmd.extend(["--context-key", key])
    cmd.extend(["breadcrumb", "--host", "codex"])
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5, check=False)
    except Exception as exc:
        print("<workflow-state>")
        print("Status: no_task")
        print(f"Could not resolve Cyralis workflow state: {exc}")
        print("</workflow-state>")
        return
    if result.stdout.strip():
        print(result.stdout.strip())
    else:
        print("<workflow-state>")
        print("Status: no_task")
        print("Cyralis workflow resolver returned no output.")
        print("</workflow-state>")


def main() -> int:
    data = read_hook_input()
    cwd = data.get("cwd") if isinstance(data.get("cwd"), str) else None
    root = find_root(Path(cwd) if cwd else Path.cwd())
    if root is None:
        return 0
    config = root / ".cyralis" / "config.yaml"
    workflow = root / ".cyralis" / "workflow.md"
    skills = root / ".codex" / "skills"
    reference = root / ".cyralis" / "reference"
    templates = root / ".cyralis" / "templates"
    roadmap = root / ".cyralis" / "roadmap"
    features = root / ".cyralis" / "features"
    issues = root / ".cyralis" / "issues"
    refactors = root / ".cyralis" / "refactors"
    memory = root / ".cyralis" / "memory"
    print("<cyralis-context>")
    print(f"root: {root}")
    print(f"config: {config}")
    print(f"workflow: {workflow}")
    print(f"host_skill_root: {skills}")
    print(f"reference_root: {reference}")
    print(f"template_root: {templates}")
    print(f"roadmap_root: {roadmap}")
    print(f"feature_root: {features}")
    print(f"issue_root: {issues}")
    print(f"refactor_root: {refactors}")
    print(f"memory_root: {memory}")
    print("Use Cyralis recall hints when the active host binding provides them.")
    print("Workflow skills are projected into the active host skill directory; .cyralis does not store skill copies.")
    print("Workflow status is stored in each active work item's work.json.")
    print("</cyralis-context>")
    print_workflow_state(root, context_key(data))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;

const codexAgent = `name = "cyralis-memory"
description = "Use Cyralis context and memory boundaries when working in this repository."
instructions = """
Read .cyralis/workflow.md and .cyralis/config.yaml first. For feature work,
load the matching cs-feat skill from the Codex skill projection. Workflow status is in the active
work item's work.json; CodeStable-style artifact status fields remain artifact
metadata. Keep changes inside the context, workflow, and memory boundary unless
the user explicitly expands scope.
"""
`;

export const codexTemplates: Array<[string, string]> = [
  [".codex/config.toml", codexConfig],
  [".codex/hooks.json", codexHooks],
  [".codex/hooks/inject-context-memory.py", codexHook],
  [".codex/agents/cyralis-memory.toml", codexAgent],
  ...hostSkillTemplates(".codex/skills"),
];
