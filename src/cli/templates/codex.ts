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
"""Emit Cyralis session context plus per-turn recall for Codex hooks."""

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
    for key in ("CYRALIS_CONTEXT_ID", "CODEX_SESSION_ID", "CODEX_CONVERSATION_ID", "SESSION_ID"):
        value = os.environ.get(key)
        if value:
            return sanitize_key(value)
    return None


def is_compact_event(data: dict) -> bool:
    for key in ("compact", "compacted", "is_compaction", "after_compact"):
        if data.get(key) is True:
            return True
    for key in ("event", "hook_event", "hook_event_name", "type", "trigger", "reason", "source"):
        value = data.get(key)
        if isinstance(value, str) and "compact" in value.lower():
            return True
    return False


def context_marker_path(root: Path, key: str) -> Path:
    return root / ".cyralis" / "runtime" / "context-injections" / f"{key}.json"


def should_emit_session_context(root: Path, data: dict) -> bool:
    key = context_key(data)
    if not key:
        return True
    path = context_marker_path(root, key)
    emit = is_compact_event(data) or not path.is_file()
    if emit:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps({
                "context_key": key,
                "updated_at": int(time.time()),
                "reason": "compact" if is_compact_event(data) else "session_start",
            }, ensure_ascii=False) + "\\n", encoding="utf-8")
        except OSError:
            pass
    return emit


def read_limited(path: Path, max_chars: int) -> str | None:
    try:
        text = path.read_text(encoding="utf-8").strip()
    except OSError:
        return None
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "\\n[truncated]"


def extract_user_text(value, depth: int = 0) -> str:
    if depth > 4 or value is None:
        return ""
    if isinstance(value, str):
        return value[:12000]
    if isinstance(value, list):
        parts = [extract_user_text(item, depth + 1) for item in value]
        return "\\n".join(part for part in parts if part)[:12000]
    if not isinstance(value, dict):
        return ""

    for key in ("prompt", "user_prompt", "userPrompt", "message", "input", "text", "query"):
        text = extract_user_text(value.get(key), depth + 1)
        if text:
            return text[:12000]

    parts = []
    for key, item in value.items():
        if key in {"cwd", "session_id", "conversation_id", "thread_id", "transcript_path"}:
            continue
        text = extract_user_text(item, depth + 1)
        if text:
            parts.append(text)
    return "\\n".join(parts)[:12000]


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
    if not text.startswith("---\\n"):
        return None
    end = text.find("\\n---", 4)
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
    text = re.sub(r"\\s+", " ", " ".join(lines)).strip()
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


def print_project_context(root: Path) -> None:
    config = root / ".cyralis" / "config.yaml"
    workflow = root / ".cyralis" / "workflow.md"
    reference = root / ".cyralis" / "reference"
    templates = root / ".cyralis" / "templates"
    roadmap = root / ".cyralis" / "roadmap"
    features = root / ".cyralis" / "features"
    issues = root / ".cyralis" / "issues"
    refactors = root / ".cyralis" / "refactors"
    architecture_index = root / ".cyralis" / "architecture" / "ARCHITECTURE.md"

    print("[project_context]")
    print(f"config: {config}")
    print(f"workflow: {workflow}")
    print(f"reference_root: {reference}")
    print(f"template_root: {templates}")
    print(f"roadmap_root: {roadmap}")
    print(f"feature_root: {features}")
    print(f"issue_root: {issues}")
    print(f"refactor_root: {refactors}")
    for label, path, limit in [
        (".cyralis/architecture/ARCHITECTURE.md", architecture_index, 10000),
    ]:
        content = read_limited(path, limit)
        if content:
            print("")
            print(f"--- {label} ---")
            print(content)


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
    if should_emit_session_context(root, data):
        print("<cyralis-context>")
        print("[session_identity]")
        print(f"cwd: {root}")
        print("")
        print_project_context(root)
        print("</cyralis-context>")
        print_workflow_state(root, context_key(data))
    print_recall_hints(root, extract_user_text(data))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;

export const codexTemplates: Array<[string, string]> = [
  [".codex/config.toml", codexConfig],
  [".codex/hooks.json", codexHooks],
  [".codex/hooks/inject-context-memory.py", codexHook],
  ...hostSkillTemplates(".codex/skills"),
];
