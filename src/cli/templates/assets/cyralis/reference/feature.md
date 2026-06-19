# Feature Reference

## 1. Design contract

Feature design is the source input for implement and acceptance.

Frontmatter:

```yaml
---
doc_type: feature-design
feature: 2026-04-12-user-auth
requirement: user-auth-email
roadmap: permission-system
roadmap_item: permission-rbac-core
summary: 支持用户通过邮箱验证码登录后台
tags: [auth, email, login]
---
```

Required: `doc_type`, `feature`, `summary`, `tags`.

## 2. Standard sections

```text
0. 术语约定
1. 决策与约束
2. 名词与编排
  2.1 名词层
  2.2 编排层
  2.3 挂载点清单
  2.4 推进策略
  2.5 结构健康度与微重构
3. 验收契约
4. 与项目级架构文档的关系
```

### 2.1 Name layer

Write current entities / value objects / interface contracts, then the change.

### 2.2 Orchestration

Show the main flow, then the change in control flow and process rules.

### 2.3 Mount points

Only list things whose removal makes the feature disappear from user / system view.

### 2.4 Progression plan

Break work into paradigm-level steps, not file-level steps.

### 2.5 Structure health

Evaluate file pressure and directory pressure. Conclude one of:

- do nothing
- micro-refactor (split file)
- micro-refactor (reorganize directory)

If the change needs signature changes, semantic changes, or module split/merge, push it out of this feature.

## 3. Checklist contract

Checklist items are derived from the design:

- `steps`: paradigm-level execution slices
- `checks`: reviewable contract items

Keep `technical-only` items when there is no user-visible behavior.

## 4. Roadmap linkage

When a feature starts from roadmap:

- fill `roadmap`
- fill `roadmap_item`
- mark the roadmap item in-progress at design start
- mark it done at acceptance

## 5. Behavior evaluation

Write scenarios only when the feature changes user-visible flow, observable result, failure / rollback path, or cross-step invariant.

## 6. Complexity defaults

Use the default code-dimension combo unless the feature clearly deviates.

- robustness
- structure
- performance
- readability
- evolvability
- observability
- testability
- security

## 7. Default combinations

| Scenario | Combination |
|---|---|
| casual code change | L1 + inline + careless + self + experimental |
| internal tool | L2 + functions + reasonable + team + active + logged + testable |
| public library or service | L3 + modules + budgeted + public + stable + traced + tested + validated |

If not stated, use the scenario default and only call out deviations.
