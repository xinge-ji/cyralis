#!/usr/bin/env python3
"""Cyralis workflow state helper.

This project-local helper owns active-work resolution and gated workflow
status transitions. Host hooks may read through it, but hooks must not write
workflow state directly.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

try:
    import yaml  # type: ignore
    _HAS_PYYAML = True
except ImportError:
    _HAS_PYYAML = False


CYRALIS_DIR = ".cyralis"
WORK_JSON = "work.json"
STATUS_VALUES = {"design", "implement", "verify", "done"}
WORK_ROOTS = {
    "roadmap": "roadmap",
    "feature": "features",
    "issue": "issues",
    "refactor": "refactors",
}
COMMON_REFERENCES = [
    ".cyralis/reference/shared-conventions.md",
    ".cyralis/reference/work-json.md",
    ".cyralis/reference/tools.md",
]
MODE_REFERENCES = {
    "roadmap": [
        ".cyralis/reference/decision-hygiene.md",
    ],
    "feature": [
        ".cyralis/reference/feature-workflow.md",
        ".cyralis/reference/decision-hygiene.md",
        ".cyralis/reference/cross-layer-thinking.md",
        ".cyralis/reference/code-reuse-thinking.md",
    ],
    "issue": [
        ".cyralis/reference/debugging-governance.md",
        ".cyralis/reference/cross-layer-thinking.md",
        ".cyralis/reference/code-reuse-thinking.md",
    ],
    "refactor": [
        ".cyralis/reference/code-dimensions.md",
        ".cyralis/reference/cross-layer-thinking.md",
        ".cyralis/reference/code-reuse-thinking.md",
    ],
}


def find_root(start: Path) -> Path | None:
    cur = start.resolve()
    while cur != cur.parent:
        if (cur / CYRALIS_DIR).is_dir():
            return cur
        cur = cur.parent
    return None


def read_json(path: Path) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def parse_yaml_scalar(raw: str) -> Any:
    value = raw.strip()
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1]
        return [item.strip().strip("'\"") for item in inner.split(",") if item.strip()]
    lower = value.lower()
    if lower in ("true", "yes"):
        return True
    if lower in ("false", "no"):
        return False
    if lower in ("null", "~", ""):
        return None
    return value.strip("'\"")


def parse_roadmap_items_yaml_fallback(text: str) -> dict[str, Any]:
    data: dict[str, Any] = {}
    items: list[dict[str, Any]] = []
    in_items = False
    current: dict[str, Any] | None = None
    pending_list_key: str | None = None

    for raw in text.splitlines():
        stripped = raw.strip()
        if not stripped or stripped.startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip(" "))

        if not in_items:
            if ":" not in stripped:
                continue
            key, _, value = stripped.partition(":")
            key = key.strip()
            if key == "items":
                in_items = True
                data["items"] = items
            else:
                data[key] = parse_yaml_scalar(value)
            continue

        if stripped.startswith("- "):
            rest = stripped[2:].strip()
            if indent <= 2:
                current = {}
                items.append(current)
                pending_list_key = None
                if ":" in rest:
                    key, _, value = rest.partition(":")
                    key = key.strip()
                    if value.strip():
                        current[key] = parse_yaml_scalar(value)
                    else:
                        current[key] = []
                        pending_list_key = key
                continue
            if current is not None and pending_list_key:
                current.setdefault(pending_list_key, []).append(parse_yaml_scalar(rest))
            continue

        if current is None or ":" not in stripped:
            continue
        key, _, value = stripped.partition(":")
        key = key.strip()
        if value.strip():
            current[key] = parse_yaml_scalar(value)
            pending_list_key = None
        else:
            current[key] = []
            pending_list_key = key

    data["items"] = items
    return data


def read_yaml_mapping(path: Path) -> dict[str, Any] | None:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return None
    if _HAS_PYYAML:
        try:
            value = yaml.safe_load(text)
            if isinstance(value, dict):
                return value
        except yaml.YAMLError:
            pass
    return parse_roadmap_items_yaml_fallback(text)


def sanitize_key(raw: str) -> str:
    value = re.sub(r"[^A-Za-z0-9_.-]+", "-", raw.strip())
    return value.strip("-._") or "session"


def context_key(explicit: str | None) -> str | None:
    if explicit:
        return sanitize_key(explicit)
    for name in (
        "CYRALIS_CONTEXT_ID",
        "TRELLIS_CONTEXT_ID",
        "CODEX_SESSION_ID",
        "CODEX_CONVERSATION_ID",
        "PI_SESSION_ID",
        "CLAUDE_SESSION_ID",
        "SESSION_ID",
    ):
        value = os.environ.get(name)
        if value:
            return sanitize_key(value)
    return None


def sessions_dir(root: Path) -> Path:
    return root / CYRALIS_DIR / "runtime" / "sessions"


def session_file(root: Path, key: str) -> Path:
    return sessions_dir(root) / f"{key}.json"


def repo_relative(root: Path, path: Path) -> str:
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return str(path)


def resolve_work_dir(root: Path, ref: str) -> Path | None:
    candidate = Path(ref)
    if not candidate.is_absolute():
        candidate = root / candidate
    if (candidate / WORK_JSON).is_file():
        return candidate.resolve()

    for root_name in WORK_ROOTS.values():
        work_root = root / CYRALIS_DIR / root_name
        if not work_root.is_dir():
            continue
        for work_json in work_root.glob(f"*/{WORK_JSON}"):
            if work_json.parent.name == ref or work_json.parent.name.endswith(f"-{ref}"):
                return work_json.parent.resolve()
    return None


def iter_work_records(root: Path) -> list[tuple[Path, dict[str, Any], str]]:
    records: list[tuple[Path, dict[str, Any], str]] = []
    for mode, root_name in WORK_ROOTS.items():
        base = root / CYRALIS_DIR / root_name
        if not base.is_dir():
            continue
        for work_json in sorted(base.glob(f"*/{WORK_JSON}")):
            data = read_json(work_json)
            if not data:
                continue
            records.append((work_json.parent, data, mode))
    return records


def summarize_work_item(root: Path, work_dir: Path, work: dict[str, Any], mode_hint: str, host: str, active_path: str | None = None) -> dict[str, Any]:
    path = repo_relative(root, work_dir)
    status = str(work.get("status") or "unknown")
    mode = str(work.get("mode") or mode_hint)
    item = {
        "path": path,
        "id": work.get("id") or work_dir.name,
        "mode": mode,
        "status": status,
        "title": work.get("title") or "",
        "slug": work.get("slug") or work_dir.name,
        "active": path == active_path,
        "host_skill": host_skill(host, mode, status, work),
        "next": workflow_next(work_dir, work),
    }
    return item


def iter_work_items(root: Path) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for work_dir, data, mode in iter_work_records(root):
        items.append({
            "path": repo_relative(root, work_dir),
            "id": data.get("id") or work_dir.name,
            "mode": data.get("mode") or mode,
            "status": data.get("status") or "unknown",
            "title": data.get("title") or "",
            "slug": data.get("slug") or work_dir.name,
        })
    return items


def current_work_ref(root: Path, key: str | None) -> tuple[str | None, str]:
    if key:
        data = read_json(session_file(root, key)) or {}
        current = data.get("current_work")
        if isinstance(current, str) and current:
            return current, "session"

    files = sorted(sessions_dir(root).glob("*.json"))
    if len(files) == 1:
        data = read_json(files[0]) or {}
        current = data.get("current_work")
        if isinstance(current, str) and current:
            return current, "single-session-fallback"
    if not key and len(files) > 1:
        return None, "ambiguous"
    return None, "none"


def load_current(root: Path, key: str | None) -> tuple[Path | None, dict[str, Any] | None, str]:
    ref, source = current_work_ref(root, key)
    if not ref:
        return None, None, source
    work_dir = resolve_work_dir(root, ref)
    if not work_dir:
        return None, None, "stale"
    data = read_json(work_dir / WORK_JSON)
    if not data:
        return work_dir, None, "invalid"
    return work_dir, data, source


def artifact(work: dict[str, Any], name: str) -> dict[str, Any]:
    artifacts = work.get("artifacts")
    if not isinstance(artifacts, dict):
        return {}
    value = artifacts.get(name)
    return value if isinstance(value, dict) else {}


def artifact_path(work_dir: Path, work: dict[str, Any], name: str) -> Path | None:
    value = artifact(work, name).get("path")
    if not isinstance(value, str) or not value:
        return None
    path = Path(value)
    return path if path.is_absolute() else work_dir / path


def artifact_exists(work_dir: Path, work: dict[str, Any], name: str) -> bool:
    path = artifact_path(work_dir, work, name)
    return bool(path and path.is_file())


def frontmatter_status(path: Path | None) -> str | None:
    if not path or not path.is_file():
        return None
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return None
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    if end == -1:
        return None
    for line in text[3:end].splitlines():
        if line.strip().startswith("status:"):
            return line.partition(":")[2].strip().strip("'\"")
    return None


def artifact_confirmed(work_dir: Path, work: dict[str, Any], name: str) -> bool:
    info = artifact(work, name)
    if info.get("confirmed") is True:
        return True
    if info.get("approval") == "approved":
        return True
    return frontmatter_status(artifact_path(work_dir, work, name)) in {"confirmed", "approved"}


def issue_quick_lane(work: dict[str, Any]) -> bool:
    return work.get("mode") == "issue" and artifact(work, "fix").get("quick_lane") is True


def parse_checklist_steps(path: Path | None) -> list[dict[str, str]]:
    if not path or not path.is_file():
        return []
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return []

    steps: list[dict[str, str]] = []
    in_steps = False
    current: dict[str, str] | None = None
    for raw in lines:
        stripped = raw.strip()
        if stripped == "steps:":
            in_steps = True
            continue
        if stripped == "checks:":
            break
        if not in_steps:
            continue
        if stripped.startswith("- "):
            if current:
                steps.append(current)
            current = {}
            rest = stripped[2:]
            if ":" in rest:
                key, _, value = rest.partition(":")
                current[key.strip()] = value.strip().strip("'\"")
            continue
        if current is not None and ":" in stripped:
            key, _, value = stripped.partition(":")
            current[key.strip()] = value.strip().strip("'\"")
    if current:
        steps.append(current)
    return steps


def checklist_path(work_dir: Path, work: dict[str, Any]) -> Path | None:
    return artifact_path(work_dir, work, "checklist")


def checklist_all_done(work_dir: Path, work: dict[str, Any]) -> bool:
    steps = parse_checklist_steps(checklist_path(work_dir, work))
    return bool(steps) and all(step.get("status") == "done" for step in steps)


def next_pending_step(work_dir: Path, work: dict[str, Any]) -> str | None:
    for step in parse_checklist_steps(checklist_path(work_dir, work)):
        if step.get("status") != "done":
            return step.get("action") or step.get("name")
    return None


def transition_blockers(work_dir: Path, work: dict[str, Any], target: str) -> list[str]:
    mode = work.get("mode")
    status = work.get("status")
    blockers: list[str] = []

    if target not in STATUS_VALUES:
        return [f"unsupported target status: {target}"]
    if status == target:
        return []

    if mode == "feature":
        if status == "design" and target == "implement":
            if artifact(work, "design").get("approval") != "approved":
                blockers.append("artifacts.design.approval must be approved")
            if not artifact_exists(work_dir, work, "checklist"):
                blockers.append("checklist artifact must exist")
        elif status == "implement" and target == "verify":
            if artifact(work, "implementation").get("done") is not True and not checklist_all_done(work_dir, work):
                blockers.append("implementation.done must be true or checklist steps must all be done")
        elif status == "verify" and target == "done":
            if artifact(work, "acceptance").get("result") != "passed":
                blockers.append("acceptance.result must be passed")
        elif status == "verify" and target == "implement":
            if artifact(work, "acceptance").get("result") != "failed":
                blockers.append("acceptance.result must be failed")
        else:
            blockers.append(f"unsupported feature transition: {status} -> {target}")

    elif mode == "issue":
        quick_lane = issue_quick_lane(work)
        if status == "design" and target == "implement":
            if not artifact_confirmed(work_dir, work, "report"):
                blockers.append("issue report must be confirmed")
        elif status == "implement" and target == "verify":
            if quick_lane:
                blockers.append("quick lane completes from implement -> done; do not transition to verify")
            elif not artifact_confirmed(work_dir, work, "analysis"):
                blockers.append("issue analysis must be confirmed")
        elif status == "implement" and target == "done":
            if not quick_lane:
                blockers.append("implement -> done is only supported for issue quick lane")
            if artifact(work, "fix").get("result") != "passed":
                blockers.append("fix.result must be passed")
            if not artifact_exists(work_dir, work, "fix"):
                blockers.append("fix-note artifact must exist")
        elif status == "verify" and target == "done":
            if artifact(work, "fix").get("result") != "passed":
                blockers.append("fix.result must be passed")
            if not artifact_exists(work_dir, work, "fix"):
                blockers.append("fix-note artifact must exist")
        elif status == "verify" and target == "implement":
            if artifact(work, "fix").get("result") != "failed":
                blockers.append("fix.result must be failed")
        else:
            blockers.append(f"unsupported issue transition: {status} -> {target}")

    elif mode == "refactor":
        scan_required = artifact(work, "scan").get("required", True) is not False
        checklist_required = artifact(work, "checklist").get("required", True) is not False
        if status == "design" and target == "implement":
            if scan_required and artifact(work, "scan").get("user_reviewed") is not True:
                blockers.append("scan.user_reviewed must be true")
            if artifact(work, "design").get("approval") != "approved" and not artifact_confirmed(work_dir, work, "design"):
                blockers.append("refactor design must be approved")
            if checklist_required and not artifact_exists(work_dir, work, "checklist"):
                blockers.append("checklist artifact must exist")
        elif status == "implement" and target == "verify":
            if artifact(work, "apply").get("done") is not True and not checklist_all_done(work_dir, work):
                blockers.append("apply.done must be true or checklist steps must all be done")
        elif status == "verify" and target == "done":
            if artifact(work, "verification").get("result") != "passed":
                blockers.append("verification.result must be passed")
        elif status == "verify" and target == "implement":
            if artifact(work, "verification").get("result") != "failed":
                blockers.append("verification.result must be failed")
        else:
            blockers.append(f"unsupported refactor transition: {status} -> {target}")

    else:
        blockers.append(f"unsupported mode: {mode}")

    return blockers


def host_skill(host: str, mode: str, status: str, work: dict[str, Any] | None = None) -> str | None:
    root = f".{host}/skills"
    if mode == "feature":
        skill = {
            "design": "cs-feat-design",
            "implement": "cs-feat-impl",
            "verify": "cs-feat-accept",
            "done": "cs-feat",
        }.get(status, "cs-feat")
    elif mode == "issue":
        if status == "implement" and work is not None and issue_quick_lane(work):
            skill = "cs-issue-fix"
        else:
            skill = {
                "design": "cs-issue-report",
                "implement": "cs-issue-analyze",
                "verify": "cs-issue-fix",
                "done": "cs-issue",
            }.get(status, "cs-issue")
    elif mode == "refactor":
        skill = "cs-refactor"
    elif mode == "roadmap":
        skill = "cs-roadmap"
    else:
        return None
    return f"{root}/{skill}/SKILL.md"


def workflow_references(mode: str | None) -> list[str]:
    refs = list(COMMON_REFERENCES)
    if mode in MODE_REFERENCES:
        refs.extend(MODE_REFERENCES[mode])
    seen: set[str] = set()
    unique: list[str] = []
    for ref in refs:
        if ref in seen:
            continue
        seen.add(ref)
        unique.append(ref)
    return unique


def workflow_commands(work_root: str | None, host: str) -> dict[str, str]:
    commands = {
        "resolve": f"python .cyralis/tools/work.py resolve --json --host {host}",
        "summary": f"python .cyralis/tools/work.py summary --json --host {host}",
        "list": "python .cyralis/tools/work.py list --json",
    }
    if work_root:
        commands["transition"] = f"python .cyralis/tools/work.py transition {work_root} <target-status>"
    else:
        commands["activate"] = "python .cyralis/tools/work.py activate <work-dir>"
    return commands


def workflow_next(work_dir: Path, work: dict[str, Any]) -> str:
    status = str(work.get("status") or "unknown")
    mode = str(work.get("mode") or "unknown")
    pending = next_pending_step(work_dir, work)
    if mode == "issue":
        if status == "design":
            return "continue issue report planning"
        if status == "implement" and issue_quick_lane(work):
            return "run issue quick-lane fix"
        if status == "implement":
            return "continue issue root-cause analysis"
        if status == "verify":
            return "run issue standard fix verification"
        if status == "done":
            return "summarize and clear active work when appropriate"
    return {
        "design": f"continue {mode} design/report planning",
        "implement": pending or f"continue {mode} implementation/apply work",
        "verify": f"run {mode} verification/acceptance",
        "done": "summarize and clear active work when appropriate",
    }.get(status, "inspect resolver output with `python .cyralis/tools/work.py resolve --json`")


def no_task_state(reason: str, host: str) -> dict[str, Any]:
    return {
        "status": "no_task",
        "mode": None,
        "work_root": None,
        "host_skill": None,
        "next": "classify the request and create or activate a work item",
        "reason": reason,
        "blockers": [],
        "references": workflow_references(None),
        "commands": workflow_commands(None, host),
    }


def resolve_state(root: Path, key: str | None, host: str) -> dict[str, Any]:
    work_dir, work, source = load_current(root, key)
    if not work_dir or not work:
        return no_task_state(f"active work source={source}", host)

    status = str(work.get("status") or "unknown")
    if status == "done":
        return no_task_state(f"active work is done; source={source}", host)

    mode = str(work.get("mode") or "unknown")
    work_root = repo_relative(root, work_dir)

    return {
        "status": status,
        "mode": mode,
        "work_root": work_root,
        "id": work.get("id") or work_dir.name,
        "title": work.get("title") or "",
        "host_skill": host_skill(host, mode, status, work),
        "next": workflow_next(work_dir, work),
        "reason": f"work.json status={status}; source={source}",
        "blockers": [],
        "references": workflow_references(mode),
        "commands": workflow_commands(work_root, host),
    }


def build_breadcrumb(root: Path, key: str | None, host: str) -> str:
    state = resolve_state(root, key, host)
    status = str(state["status"])
    header = f"Status: {status}" if not state.get("work_root") else f"Work: {state['work_root']} ({status})"
    lines = [
        "<workflow-state>",
        header,
        f"mode: {state.get('mode') or '-'}",
        f"host_skill: {state.get('host_skill') or '-'}",
        f"next: {state.get('next')}",
    ]
    references = state.get("references")
    if isinstance(references, list) and references:
        lines.append("references:")
        for ref in references:
            lines.append(f"- {ref}")
    commands = state.get("commands")
    if isinstance(commands, dict) and commands:
        lines.append("commands:")
        for name, command in commands.items():
            lines.append(f"- {name}: {command}")
    lines.append("</workflow-state>")
    return "\n".join(lines)


def cmd_list(args: argparse.Namespace, root: Path, key: str | None) -> int:
    items = iter_work_items(root)
    if args.json:
        print(json.dumps({"items": items}, ensure_ascii=False, indent=2))
    else:
        for item in items:
            print(f"{item['path']} ({item['mode']}/{item['status']})")
    return 0


def coerce_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item)]
    if isinstance(value, str) and value:
        return [value]
    return []


def planned_roadmap_items(root: Path, host: str) -> list[dict[str, Any]]:
    base = root / CYRALIS_DIR / "roadmap"
    if not base.is_dir():
        return []

    planned: list[dict[str, Any]] = []
    for items_yaml in sorted(base.glob("*/*-items.yaml")):
        data = read_yaml_mapping(items_yaml)
        if not data:
            continue
        raw_items = data.get("items")
        if not isinstance(raw_items, list):
            continue
        status_by_slug = {
            str(item.get("slug")): str(item.get("status") or "unknown")
            for item in raw_items
            if isinstance(item, dict) and item.get("slug")
        }
        roadmap = str(data.get("roadmap") or items_yaml.parent.name)
        for raw_item in raw_items:
            if not isinstance(raw_item, dict):
                continue
            status = str(raw_item.get("status") or "unknown")
            if status != "planned":
                continue
            slug = str(raw_item.get("slug") or "")
            depends_on = coerce_string_list(raw_item.get("depends_on"))
            blocked_by = [
                dep for dep in depends_on
                if status_by_slug.get(dep) != "done"
            ]
            if blocked_by:
                next_step = f"wait for roadmap dependencies: {', '.join(blocked_by)}"
            else:
                next_step = "start feature design from roadmap item"
            planned.append({
                "path": repo_relative(root, items_yaml),
                "roadmap_root": repo_relative(root, items_yaml.parent),
                "roadmap": roadmap,
                "slug": slug,
                "status": status,
                "description": raw_item.get("description") or "",
                "depends_on": depends_on,
                "blocked_by": blocked_by,
                "ready": not blocked_by,
                "feature": raw_item.get("feature"),
                "minimal_loop": raw_item.get("minimal_loop") is True,
                "notes": raw_item.get("notes"),
                "host_skill": f".{host}/skills/cs-feat-design/SKILL.md",
                "next": next_step,
            })
    return planned


def build_summary(root: Path, key: str | None, host: str) -> dict[str, Any]:
    current = resolve_state(root, key, host)
    active_path = current.get("work_root") if isinstance(current.get("work_root"), str) else None
    items: list[dict[str, Any]] = []
    roadmap_items = planned_roadmap_items(root, host)
    counts = {
        "total": 0,
        "open": 0,
        "done": 0,
        "roadmap_planned": len(roadmap_items),
        "roadmap_ready": sum(1 for item in roadmap_items if item.get("ready")),
        "by_mode": {},
        "by_status": {},
    }

    for work_dir, work, mode_hint in iter_work_records(root):
        item = summarize_work_item(root, work_dir, work, mode_hint, host, active_path)
        mode = str(item["mode"])
        status = str(item["status"])
        counts["total"] += 1
        counts["by_mode"][mode] = counts["by_mode"].get(mode, 0) + 1
        counts["by_status"][status] = counts["by_status"].get(status, 0) + 1
        if status == "done":
            counts["done"] += 1
            continue
        counts["open"] += 1
        items.append(item)

    status_order = {"design": 0, "implement": 1, "verify": 2, "unknown": 3}
    items.sort(key=lambda item: (not item.get("active"), status_order.get(str(item.get("status")), 4), str(item.get("path"))))
    return {
        "current": current if current.get("work_root") else None,
        "counts": counts,
        "items": items,
        "roadmap_items": roadmap_items,
    }


def format_summary(summary: dict[str, Any]) -> str:
    counts = summary.get("counts") if isinstance(summary.get("counts"), dict) else {}
    current = summary.get("current") if isinstance(summary.get("current"), dict) else None
    items = summary.get("items") if isinstance(summary.get("items"), list) else []
    roadmap_items = summary.get("roadmap_items") if isinstance(summary.get("roadmap_items"), list) else []
    lines = [
        "Cyralis work summary",
        f"Open: {counts.get('open', 0)} / Total: {counts.get('total', 0)} / Done: {counts.get('done', 0)}",
    ]
    if counts.get("roadmap_planned", 0):
        lines.append(f"Roadmap planned: {counts.get('roadmap_planned', 0)} / Ready: {counts.get('roadmap_ready', 0)}")
    if current:
        lines.append(f"Active: {current.get('work_root')} ({current.get('mode')}/{current.get('status')})")
        if current.get("next"):
            lines.append(f"Active next: {current.get('next')}")
    else:
        lines.append("Active: none")
    lines.append("")

    if not items and not roadmap_items:
        lines.append("No unfinished work items.")
        return "\n".join(lines)

    if items:
        lines.append("Unfinished work:")
        for item in items:
            prefix = "*" if item.get("active") else "-"
            title = f" - {item.get('title')}" if item.get("title") else ""
            lines.append(f"{prefix} {item.get('path')} ({item.get('mode')}/{item.get('status')}){title}")
            if item.get("next"):
                lines.append(f"  next: {item.get('next')}")
        if roadmap_items:
            lines.append("")

    if roadmap_items:
        lines.append("Planned roadmap items:")
        for item in roadmap_items:
            marker = "*" if item.get("ready") else "-"
            suffix = " ready" if item.get("ready") else f" blocked by {', '.join(item.get('blocked_by') or [])}"
            minimal = " minimal-loop" if item.get("minimal_loop") else ""
            lines.append(f"{marker} {item.get('roadmap')}/{item.get('slug')} ({item.get('status')};{minimal}{suffix})")
            if item.get("description"):
                lines.append(f"  {item.get('description')}")
    return "\n".join(lines)


def cmd_summary(args: argparse.Namespace, root: Path, key: str | None) -> int:
    summary = build_summary(root, key, args.host)
    if args.json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    else:
        print(format_summary(summary))
    return 0


def cmd_activate(args: argparse.Namespace, root: Path, key: str | None) -> int:
    key = key or "manual"
    work_dir = resolve_work_dir(root, args.work)
    if not work_dir:
        print(f"Error: work item not found: {args.work}", file=sys.stderr)
        return 1
    rel = repo_relative(root, work_dir)
    write_json(session_file(root, key), {"current_work": rel})
    print(rel)
    return 0


def cmd_clear(args: argparse.Namespace, root: Path, key: str | None) -> int:
    key = key or "manual"
    path = session_file(root, key)
    if path.is_file():
        path.unlink()
    return 0


def cmd_current(args: argparse.Namespace, root: Path, key: str | None) -> int:
    work_dir, work, source = load_current(root, key)
    data = {
        "work_root": repo_relative(root, work_dir) if work_dir else None,
        "source": source,
        "work": work,
    }
    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
    elif data["work_root"]:
        print(data["work_root"])
    return 0 if data["work_root"] else 1


def cmd_resolve(args: argparse.Namespace, root: Path, key: str | None) -> int:
    state = resolve_state(root, key, args.host)
    if args.json:
        print(json.dumps(state, ensure_ascii=False, indent=2))
    else:
        print(f"{state['status']}: {state['next']}")
    return 0


def cmd_transition(args: argparse.Namespace, root: Path, key: str | None) -> int:
    work_dir = resolve_work_dir(root, args.work)
    if not work_dir:
        print(f"Error: work item not found: {args.work}", file=sys.stderr)
        return 1
    path = work_dir / WORK_JSON
    work = read_json(path)
    if not work:
        print(f"Error: invalid work.json: {path}", file=sys.stderr)
        return 1
    blockers = transition_blockers(work_dir, work, args.target)
    if blockers:
        payload = {"ok": False, "blockers": blockers}
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 2
    work["status"] = args.target
    write_json(path, work)
    print(json.dumps({"ok": True, "status": args.target}, ensure_ascii=False, indent=2))
    return 0


def cmd_breadcrumb(args: argparse.Namespace, root: Path, key: str | None) -> int:
    print(build_breadcrumb(root, key, args.host))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Cyralis workflow state helper")
    parser.add_argument("--cwd", default=os.getcwd(), help="Repository directory")
    parser.add_argument("--context-key", help="Session context key")
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list")
    p_list.add_argument("--json", action="store_true")
    p_list.set_defaults(func=cmd_list)

    p_summary = sub.add_parser("summary")
    p_summary.add_argument("--json", action="store_true")
    p_summary.add_argument("--text", action="store_true", help="Print the human-readable summary; this is the default.")
    p_summary.add_argument("--host", choices=["codex", "pi"], default="codex")
    p_summary.set_defaults(func=cmd_summary)

    p_current = sub.add_parser("current")
    p_current.add_argument("--json", action="store_true")
    p_current.set_defaults(func=cmd_current)

    p_activate = sub.add_parser("activate")
    p_activate.add_argument("work")
    p_activate.set_defaults(func=cmd_activate)

    p_clear = sub.add_parser("clear")
    p_clear.set_defaults(func=cmd_clear)

    p_resolve = sub.add_parser("resolve")
    p_resolve.add_argument("--json", action="store_true")
    p_resolve.add_argument("--host", choices=["codex", "pi"], default="codex")
    p_resolve.set_defaults(func=cmd_resolve)

    p_transition = sub.add_parser("transition")
    p_transition.add_argument("work")
    p_transition.add_argument("target")
    p_transition.set_defaults(func=cmd_transition)

    p_breadcrumb = sub.add_parser("breadcrumb")
    p_breadcrumb.add_argument("--host", choices=["codex", "pi"], default="codex")
    p_breadcrumb.set_defaults(func=cmd_breadcrumb)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    root = find_root(Path(args.cwd))
    if not root:
        print("Error: .cyralis root not found", file=sys.stderr)
        return 1
    key = context_key(args.context_key)
    return args.func(args, root, key)


if __name__ == "__main__":
    raise SystemExit(main())
