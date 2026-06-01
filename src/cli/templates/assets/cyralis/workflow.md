# Cyralis Workflow

Cyralis 的工作流只管两件事：

1. 把当前工作路由到正确的 mode 和 status
2. 告诉 AI 本轮应该读哪个 skill / reference / artifact

状态事实不写进 prompt、design.md、acceptance.md，也不靠 AI 自己记。
状态事实统一写进：

```text
.cyralis/features/<feature>/work.json
.cyralis/roadmap/<roadmap>/work.json
.cyralis/issues/<issue>/work.json
.cyralis/refactors/<refactor>/work.json
```

---

## 0. 状态模型

Cyralis 只保留 5 个 workflow status：

```text
no_task -> design -> implement -> verify -> done -> no_task
```

支持的 mode：

- roadmap：把一个大目标拆成多个可独立闭环的 feature
- feature：新增或改变一个产品能力
- issue：修复已有行为的问题
- refactor：行为不变的结构优化

status 是粗粒度阶段。具体下一步由 resolver 结合 mode、work.json、artifact、依赖关系判断。

---

## 1. Skill 路由

feature mode 采用 `cs-feat` 家族 skill，并在 Cyralis 中只改状态事实源。skill 不存放在 `.cyralis`；安装时按 host 完整投影到 `.codex/skills` 和 `.pi/skills`：

| Workflow status | Codex projection | Pi projection |
| --- | --- | --- |
| no_task | .codex/skills/cs-feat/SKILL.md | .pi/skills/cs-feat/SKILL.md |
| design | .codex/skills/cs-feat-design/SKILL.md | .pi/skills/cs-feat-design/SKILL.md |
| implement | .codex/skills/cs-feat-impl/SKILL.md | .pi/skills/cs-feat-impl/SKILL.md |
| verify | .codex/skills/cs-feat-accept/SKILL.md | .pi/skills/cs-feat-accept/SKILL.md |
| done | .codex/skills/cs-feat/SKILL.md | .pi/skills/cs-feat/SKILL.md |

通用参考：

- .cyralis/reference/shared-conventions.md
- .cyralis/reference/feature-workflow.md
- .cyralis/reference/work-json.md
- .cyralis/reference/tools.md
- .cyralis/reference/code-dimensions.md

artifact 模板：

- .cyralis/templates/feature/work.json

---

## 2. 状态写入边界

- skill 只描述流程，不存状态
- reference 只描述共享口径，不存状态
- design.md / acceptance.md 只存设计和验收事实，不存 workflow status
- checklist.yaml 只存执行项和检查项，不存 workflow status
- work.json 是唯一状态源
- hook 只读状态并注入 context，不改状态

注意：CodeStable 原文里 checklist `steps[].status` / `checks[].status`、roadmap item `status` 是 artifact 自己的执行字段，保留原写法；它们不是 workflow status。design 的 `draft` / `approved` 在 Cyralis 中写入 `work.json.artifacts.design.approval`。

---

## 3. Feature 边界

feature 表示新增或改变一个产品能力。它可以独立存在，也可以属于 roadmap。

roadmap 可以拆出多个 feature，但每个 feature 必须能独立完成：

```text
feature design -> feature implement -> feature accept
```

feature 里发现 unrelated bug，不要顺手修；另开 issue。
feature 里发现行为不变的结构优化，不要顺手重构；另走 refactor，除非它是本 feature 的必要前置并得到用户确认。

---

[workflow-state:no_task]
没有 active work。先判断用户诉求属于 roadmap / feature / issue / refactor。
如果是 feature，读取当前 host 投影中的 `cs-feat/SKILL.md`，创建或激活 feature work item 后进入 design。
[/workflow-state:no_task]

[workflow-state:design]
active work 处于 design。feature mode 读取当前 host 投影中的 `cs-feat-design/SKILL.md`。
没有 approved design 或明确的轻量跳过确认，不允许进入 implement。
[/workflow-state:design]

[workflow-state:implement]
active work 处于 implement。feature mode 读取当前 host 投影中的 `cs-feat-impl/SKILL.md`。
按 approved design 实现，范围不要扩散。
[/workflow-state:implement]

[workflow-state:verify]
active work 处于 verify。feature mode 读取当前 host 投影中的 `cs-feat-accept/SKILL.md`。
对照 design 和 checklist 验收；acceptance 通过后才能进入 done。
[/workflow-state:verify]

[workflow-state:done]
active work 已完成。总结结果；有长期价值的事实再写 memory；如果有 parent roadmap，控制权交还 roadmap resolver。
[/workflow-state:done]
