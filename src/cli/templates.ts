export type Platform = "pi" | "codex";

export function collectTemplates(platforms: Platform[]): Map<string, string> {
  const files = new Map<string, string>();
  addCoreTemplates(files);
  if (platforms.includes("pi")) addPiTemplates(files);
  if (platforms.includes("codex")) addCodexTemplates(files);
  return files;
}

function addCoreTemplates(files: Map<string, string>): void {
  files.set("AGENTS.md", agentsMd);
  files.set(".cyralis/config.yaml", cyralisConfig);
  files.set(".cyralis/workflow.md", cyralisWorkflow);
  files.set(".cyralis/.gitignore", cyralisGitignore);
  files.set(".cyralis/memory/.gitkeep", "");
}

function addPiTemplates(files: Map<string, string>): void {
  files.set(".pi/settings.json", piSettings);
  files.set(".pi/extensions/cyralis/index.ts", piExtension);
  files.set(".pi/skills/cyralis-memory/SKILL.md", piSkill);
  files.set(".pi/prompts/cyralis-context.md", piPrompt);
}

function addCodexTemplates(files: Map<string, string>): void {
  files.set(".codex/config.toml", codexConfig);
  files.set(".codex/hooks.json", codexHooks);
  files.set(".codex/hooks/inject-context-memory.py", codexHook);
  files.set(".codex/agents/cyralis-memory.toml", codexAgent);
}

const agentsMd = `# Cyralis Agent Instructions

Cyralis is installed in this project as a context and memory layer. It does not
own UI, TUI, provider routing, shell runtime, notification, or LSP behavior.

Read .cyralis/workflow.md and .cyralis/config.yaml before changing Cyralis
project memory behavior.
`;

const cyralisConfig = `# Cyralis host-neutral configuration.

memory_root: .cyralis/memory
max_recent_turns: 10

hosts:
  codex:
    enabled: true
  pi:
    enabled: true
`;

const cyralisWorkflow = `# Cyralis Workflow

Cyralis keeps durable facts in Markdown memory and injects compact recall hints
into host agents when relevant.

The host-neutral chain is:

\`\`\`text
user input
  -> recall hints
  -> context assembly
  -> host injection
  -> assistant output
  -> assistant recall
\`\`\`
`;

const cyralisGitignore = `runtime/
cache/
memory/**/*.sqlite
memory/**/*.sqlite-*
`;

const piSettings = `{
  "enableSkillCommands": true,
  "extensions": [
    "./extensions/cyralis/index.ts"
  ],
  "skills": [
    "./skills"
  ],
  "prompts": [
    "./prompts"
  ]
}`;

const piExtension = `import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type PiLike = {
  on?: (eventName: string, handler: (...args: unknown[]) => unknown) => void;
};

export default async function cyralisPiExtension(pi: PiLike) {
  const inject = () => {
    const root = findCyralisRoot(process.cwd());
    if (!root) return undefined;
    return {
      messages: [
        {
          customType: "cyralis.context",
          display: false,
          content: [
            "<cyralis-context>",
            \`root: \${root}\`,
            \`config: \${join(root, ".cyralis", "config.yaml")}\`,
            \`memory_root: \${join(root, ".cyralis", "memory")}\`,
            "Use Cyralis recall hints when available.",
            "</cyralis-context>",
          ].join("\\n"),
        },
      ],
    };
  };

  pi.on?.("before_agent_start", inject);
  pi.on?.("input", inject);
}

function findCyralisRoot(start: string): string | null {
  let cur = resolve(start);
  while (cur !== dirname(cur)) {
    if (existsSync(join(cur, ".cyralis"))) return cur;
    cur = dirname(cur);
  }
  return null;
}
`;

const piSkill = `# Cyralis Memory

Use this skill when working with Cyralis project memory.

- .cyralis is the host-neutral state layer.
- .pi is the Pi projection.
- .codex is the Codex projection.
- Memory bodies should stay in Markdown under .cyralis/memory.
`;

const piPrompt = `# Cyralis Context

Inspect .cyralis/config.yaml and .cyralis/workflow.md before changing project
context or memory behavior.
`;

const codexConfig = `# Project-scoped Codex defaults for Cyralis.

project_doc_fallback_filenames = ["AGENTS.md"]

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
    memory = root / ".cyralis" / "memory"
    print("<cyralis-context>")
    print(f"root: {root}")
    print(f"config: {config}")
    print(f"memory_root: {memory}")
    print("Use Cyralis recall hints when the active host binding provides them.")
    print("</cyralis-context>")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;

const codexAgent = `name = "cyralis-memory"
description = "Use Cyralis context and memory boundaries when working in this repository."
instructions = """
Read AGENTS.md first. Keep changes inside the context and memory boundary unless
the user explicitly expands scope.
"""
`;

