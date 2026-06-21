import { hostSkillTemplates } from "./feature-skills.js";

const claudeSettings = `{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 -X utf8 .claude/hooks/inject-context-memory.py"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 -X utf8 .claude/hooks/inject-context-memory.py"
          }
        ]
      }
    ]
  }
}`;

const claudeHook = `#!/usr/bin/env python3
"""Emit Cyralis context plus recall hints for Claude Code."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
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
    for key in ("CYRALIS_CONTEXT_ID", "CLAUDE_SESSION_ID", "SESSION_ID"):
        value = os.environ.get(key)
        if value:
            return sanitize_key(value)
    return None


def context_marker_path(root: Path, key: str) -> Path:
    return root / ".cyralis" / "runtime" / "context-injections" / f"{key}.json"


def is_compact_event(data: dict) -> bool:
    for key in ("compact", "compacted", "is_compaction", "after_compact"):
        if data.get(key) is True:
            return True
    for key in ("event", "hook_event", "hook_event_name", "type", "trigger", "reason", "source"):
        value = data.get(key)
        if isinstance(value, str) and "compact" in value.lower():
            return True
    return False


def should_emit_session_context(root: Path, data: dict) -> bool:
    key = context_key(data)
    if not key:
        return True
    path = context_marker_path(root, key)
    emit = is_compact_event(data) or not path.is_file()
    if emit:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(
                json.dumps({
                    "context_key": key,
                    "updated_at": int(time.time()),
                    "reason": "compact" if is_compact_event(data) else "session_start",
                }, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
        except OSError:
            pass
    return emit


def extract_text(value, depth: int = 0) -> str:
    if depth > 4 or value is None:
        return ""
    if isinstance(value, str):
        return value[:12000]
    if isinstance(value, list):
        return "\n".join(part for part in (extract_text(item, depth + 1) for item in value) if part)[:12000]
    if not isinstance(value, dict):
        return ""
    for key in ("prompt", "user_prompt", "userPrompt", "message", "input", "text", "query"):
        text = extract_text(value.get(key), depth + 1)
        if text:
            return text[:12000]
    return ""


def extract_prompt(data: dict) -> str:
    return extract_text(data)


def tokenize(text: str) -> list[str]:
    tokens: set[str] = set()
    for match in re.finditer(r"[\\w\\-\\u4e00-\\u9fff\\u3040-\\u30ff\\uac00-\\ud7af]+", text.lower()):
        token = match.group(0)
        if not token:
            continue
        tokens.add(token)
        cjk = "".join(ch for ch in token if is_cjk(ch))
        if cjk:
            for size in (2, 3):
                if len(cjk) < size:
                    continue
                for index in range(0, len(cjk) - size + 1):
                    tokens.add(cjk[index:index + size])
    return list(tokens)


def is_cjk(ch: str) -> bool:
    code = ord(ch)
    return (
        0x4E00 <= code <= 0x9FFF
        or 0x3040 <= code <= 0x30FF
        or 0xAC00 <= code <= 0xD7AF
    )


def projection_files(root: Path) -> list[Path]:
    projection_root = root / ".cyralis" / "memory" / "projections"
    try:
        return sorted(path for path in projection_root.rglob("*.md") if path.is_file())
    except OSError:
        return []


def parse_memory_projection(text: str) -> dict | None:
    if not text.startswith("---\n"):
        return None
    end = text.find("\n---", 4)
    if end == -1:
        return None
    frontmatter = text[4:end]
    body = text[end + 4:].strip()
    fields: dict[str, str] = {}
    for line in frontmatter.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip()
    if fields.get("projection") != "true":
        return None
    if not fields.get("id") or not fields.get("name") or not fields.get("description"):
        return None
    return {
        "id": fields["id"],
        "name": fields["name"],
        "description": fields["description"],
        "source": fields.get("source", ""),
        "tags": parse_tags(fields.get("tags", "")),
        "body": body,
    }


def parse_tags(raw: str) -> list[str]:
    return [tag.strip() for tag in raw.strip().strip("[]").split(",") if tag.strip()]


def compact_excerpt(body: str, max_chars: int = 420) -> str:
    marker = "Search excerpt:"
    if marker in body:
        body = body.split(marker, 1)[1]
    lines = []
    for line in body.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith(("source:", "kind:", "doc_type:")):
            continue
        lines.append(line)
    text = re.sub(r"\s+", " ", " ".join(lines)).strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "..."


def recall_projection_hints(root: Path, query: str, limit: int = 3, min_score: float = 0.2) -> list[dict]:
    query_tokens = tokenize(query)
    if not query_tokens:
        return []
    scored = []
    for path in projection_files(root):
        try:
            parsed = parse_memory_projection(path.read_text(encoding="utf-8"))
        except OSError:
            continue
        if not parsed:
            continue
        haystack = tokenize(" ".join([
            parsed["name"],
            parsed["description"],
            " ".join(parsed["tags"]),
            parsed["body"],
        ]))
        if not haystack:
            continue
        hay = set(haystack)
        score = sum(1 for token in query_tokens if token in hay) / len(query_tokens)
        if score < min_score:
            continue
        scored.append((score, parsed))
    scored.sort(key=lambda item: item[0], reverse=True)
    hints = []
    for score, item in scored[:limit]:
        excerpt = compact_excerpt(item["body"])
        hints.append({**item, "score": score, "excerpt": excerpt})
    return hints


def print_recall_hints(root: Path, query: str) -> None:
    hints = recall_projection_hints(root, query)
    if not hints:
        return
    print("")
    print("<cyralis-recall>")
    print("[recall]")
    for hint in hints:
        score = f"{hint['score']:.2f}"
        source = f" | source={hint['source']}" if hint.get("source") else ""
        print(f"- {hint['id']} | score={score} | {hint['name']} | {hint['description']}{source}")
        if hint.get("excerpt"):
            print(f"  excerpt: {hint['excerpt']}")
    print("</cyralis-recall>")


def print_context(root: Path, prompt: str) -> None:
    lines = [
        "<cyralis-context>",
        "[session_identity]",
        f"cwd: {root}",
        "",
        "[project_context]",
        f"config: {root / '.cyralis' / 'config.yaml'}",
    ]
    if prompt:
        lines.extend(["", "[current_user]", prompt])
    lines.append("</cyralis-context>")
    print("\n".join(lines))


def print_workflow(root: Path, key: str | None) -> None:
    helper = root / ".cyralis" / "tools" / "work.py"
    if not helper.is_file():
        return
    cmd = [sys.executable, "-X", "utf8", str(helper), "--cwd", str(root)]
    if key:
        cmd.extend(["--context-key", key])
    cmd.extend(["breadcrumb", "--host", "claude"])
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=5, check=False)
    if result.stdout.strip():
        print(result.stdout.strip())


def main() -> int:
    data = read_hook_input()
    cwd = data.get("cwd") if isinstance(data.get("cwd"), str) else None
    start = os.environ.get("CLAUDE_PROJECT_DIR") or cwd or Path.cwd()
    root = find_root(Path(start))
    if root is None:
        return 0
    if should_emit_session_context(root, data):
        print_context(root, extract_prompt(data))
        print_workflow(root, context_key(data))
    prompt = extract_prompt(data)
    if prompt:
        print_recall_hints(root, prompt)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;

const claudeAgent = `---
name: cyralis-memory
description: Use Cyralis project guidance when working in this repository.
tools: []
---

Use Cyralis project guidance from CLAUDE.md, .cyralis/config.yaml, and the workflow helper. Keep host-specific behavior in .claude/.
`;

const claudeCommand = `---
description: Show Cyralis work summary for Claude Code
---

python3 -X utf8 .cyralis/tools/work.py summary --host claude
`;

const claudeMd = `# CLAUDE

## 项目碎片知识

开发遵循SOLID和KISS软件工程原则。

<!-- cs-note managed: 用 cs-note 维护，新条目按下面分节追加 -->

### 编译与构建

### 运行与本地起服务

### 测试

### 命令与脚本陷阱

### 路径与目录约定

### 环境变量与凭证

### 其他
`;

export const claudeTemplates: Array<[string, string]> = [
  ["CLAUDE.md", claudeMd],
  [".claude/settings.json", claudeSettings],
  [".claude/hooks/inject-context-memory.py", claudeHook],
  [".claude/agents/cyralis-memory.md", claudeAgent],
  [".claude/commands/cyralis-work.md", claudeCommand],
  ...hostSkillTemplates(".claude/skills"),
];
