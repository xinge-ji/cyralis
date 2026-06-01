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

from pathlib import Path


def find_root(start: Path) -> Path | None:
    cur = start.resolve()
    while cur != cur.parent:
        if (cur / ".cyralis").is_dir():
            return cur
        cur = cur.parent
    return None


def main() -> int:
    root = find_root(Path.cwd())
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
