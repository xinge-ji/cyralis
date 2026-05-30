#!/usr/bin/env python3
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

