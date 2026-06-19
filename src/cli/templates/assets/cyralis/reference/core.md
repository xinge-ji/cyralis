# Core Reference

## 1. Layout and naming

`AGENTS.md` is the always-loaded project note entry.

```text
AGENTS.md
.cyralis/
├── requirements/   capability vision docs
├── architecture/   current-state architecture map
├── roadmap/        big-demand planning layer
├── features/       feature spec roots
├── issues/         bug spec roots
├── refactors/      behavior-preserving refactor roots
├── audits/         audit / arch-review roots
├── compound/       learning / trick / decision / explore archive
├── brainstorms/    brainstorm spike scratch space
├── tools/          shared helper scripts
└── reference/      shared reference docs
```

### Naming

- `requirements/{slug}.md`
- `architecture/{type}-{slug}.md`
- `roadmap/{slug}/`
- `features/YYYY-MM-DD-{slug}/`
- `issues/YYYY-MM-DD-{slug}/`
- `refactors/YYYY-MM-DD-{slug}/`
- `audits/YYYY-MM-DD-{slug}/`
- `compound/YYYY-MM-DD-{doc_type}-{slug}.md`

## 2. Metadata and workflow state

Feature specs share `doc_type` / `feature` / `summary` / `tags`. Standard workflow status lives in `work.json.status`.

- `design` / `implement` / `verify` / `done`
- `design.approval`: `draft` or `approved`
- `acceptance.result`: `passed` / `failed` / `skipped`

Issue specs share `doc_type` / `issue` / `status` / `tags`.

Compound docs share `doc_type` plus their own category fields.

## 3. Shared tools

Shared scripts:

- `search-yaml.py`
- `validate-yaml.py`
- `work.py`

Typical calls:

```bash
python .cyralis/tools/search-yaml.py --dir .cyralis/compound --filter doc_type=decision --query "keyword"
python .cyralis/tools/validate-yaml.py --file {path} --require doc_type --require status
python .cyralis/tools/work.py transition <dir> <status>
```

Use `python .cyralis/tools/work.py transition <dir> <status>` for status changes; hooks and prompts only read state.

## 4. Memory projection

- `.cyralis/architecture/` and `.cyralis/compound/` are source of truth
- `.cyralis/memory/projections/` is a rebuildable recall layer
- after write / update / supersede, run `cyralis memory sync`
- compound single-file updates can use `cyralis memory sync --kind compound --source {path}`
- architecture updates can use `cyralis memory sync --kind architecture`
- projection stubs should stay short: title, summary, tags, source path, excerpt

## 5. Requirement sample

Write reqs like this:

```markdown
---
doc_type: requirement
slug: issue-flow
pitch: 修 bug 时先让 AI 探索和分析，再动手改
status: current
last_reviewed: 2026-04-21
implemented_by:
  - arch-cs-issue
tags: [debug, ai-assist]
---

# 修 bug 时先探索和分析

## 用户故事

- 作为一个刚接手别人代码的人，我希望把报错直接丢给 AI，它告诉我根因在哪，而不是自己翻三个文件摸调用链。
- 作为一个被线上问题打断的开发，我希望 AI 帮我收窄嫌疑范围，而不是自己从 git log 一条条比对。

## 为什么需要

修 bug 的难点不在改代码，在定位。

## 怎么解决

先让 AI 读现场，再由人确认后动手改。

## 边界

- 不主动扫 bug，得先有异常入口
- 线索不够时会反问，不瞎猜
```

## 6. Project notes

`AGENTS.md` is the short, durable project note surface. Keep it terse:

- build / run / test traps
- path and naming traps
- environment variables and credentials
- one-line project-specific hard constraints

## 7. Maintainer notes

When extending shared rules:

- prefer a themed reference over a single skill edit
- path naming goes in this file
- metadata goes in this file
- workflow status goes in this file
- completion / review guidance goes in `shared.md`

If a new spec artifact appears, register its path here first, then update the relevant shared reference and skill.
