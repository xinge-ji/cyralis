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

active work 是 session-scoped 指针，存放在 `.cyralis/runtime/sessions/<context-key>.json`。项目里可以同时存在多个 `design` / `implement` / `verify` work item，但每个 AI session 只解析自己的 active work；没有 context key 且存在多个 session 时 resolver 不猜。

本地状态 helper：

```bash
python .cyralis/tools/work.py list --json
python .cyralis/tools/work.py summary --json
python .cyralis/tools/work.py summary --text
python .cyralis/tools/work.py current --json
python .cyralis/tools/work.py activate <work-dir>
python .cyralis/tools/work.py clear
python .cyralis/tools/work.py resolve --json
python .cyralis/tools/work.py transition <work-dir> <target-status>
python .cyralis/tools/work.py breadcrumb --host codex|pi
```

`activate` / `clear` 没有 context key 时写入 `manual` session；resolver 只有在项目里只有一个 session 指针时才做 fallback，多个 session 时返回 no_task 并标记 ambiguous，不猜当前任务。

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

issue mode 采用 `cs-issue` 家族 skill。通用 status 映射到 issue 语义：`design` = report，`implement` = analyze（标准路径）或 quick-lane fix（快速通道），`verify` = 标准路径 fix。调试治理不改变 status，只约束 analyze / fix 的证据和完成口径：

| Workflow status | Codex projection | Pi projection |
| --- | --- | --- |
| no_task | .codex/skills/cs-issue/SKILL.md | .pi/skills/cs-issue/SKILL.md |
| design | .codex/skills/cs-issue-report/SKILL.md | .pi/skills/cs-issue-report/SKILL.md |
| implement | 标准路径：.codex/skills/cs-issue-analyze/SKILL.md；快速通道：.codex/skills/cs-issue-fix/SKILL.md | 标准路径：.pi/skills/cs-issue-analyze/SKILL.md；快速通道：.pi/skills/cs-issue-fix/SKILL.md |
| verify | .codex/skills/cs-issue-fix/SKILL.md | .pi/skills/cs-issue-fix/SKILL.md |
| done | .codex/skills/cs-issue/SKILL.md | .pi/skills/cs-issue/SKILL.md |

通用参考：

- .cyralis/reference/shared-conventions.md
- .cyralis/reference/debugging-governance.md
- .cyralis/reference/decision-hygiene.md
- .cyralis/reference/feature-workflow.md
- .cyralis/reference/work-json.md
- .cyralis/reference/tools.md
- .cyralis/reference/code-dimensions.md

领域辅助 skill：

- `.codex/skills/cs-backend/SKILL.md` / `.pi/skills/cs-backend/SKILL.md`：后端 owner、contract、data boundary、validation 口径；只在当前工作实际触及后端责任时读取，不改变 workflow status
- `.codex/skills/cs-ui/SKILL.md` / `.pi/skills/cs-ui/SKILL.md`：UI user journey、state model、interaction、browser/manual validation 口径；只在当前工作实际触及 UI 责任时读取，不改变 workflow status

artifact 模板：

- .cyralis/templates/feature/work.json
- .cyralis/templates/issue/work.json
- .cyralis/templates/refactor/work.json

---

## 2. 状态写入边界

- skill 只描述流程，不存状态
- reference 只描述共享口径，不存状态
- design.md / acceptance.md 只存设计和验收事实，不存 workflow status
- checklist.yaml 只存执行项和检查项，不存 workflow status
- work.json 是唯一状态源
- hook 只读状态并注入 context，不改状态
- workflow status 变更必须调用 `python .cyralis/tools/work.py transition <work-dir> <target-status>`，不由 skill / prompt 直接手写

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

## 4. Issue 边界

issue 表示已有行为坏了。它可以修 bug、异常行为、文档错误、测试失败或性能退化，但不偷偷加入新能力。修复中发现必须新增产品能力才能真正解决时，先完成 issue 的 report / analysis 记录，再视情况另开 feature。

issue 调试治理由 `.cyralis/reference/debugging-governance.md` 提供。它只回答"根因是否证据化、owner 是否正确、能否动手、能否宣告修复"，不写 workflow status，也不替代 `.cyralis/issues/<issue>/work.json`。

快速通道不进入 report / analysis / verify 阶段，只创建 / 激活 issue work item 并以 `work.json.status=implement`、`artifacts.fix.quick_lane=true` 直接路由到 `cs-issue-fix`。它不跳过调试证据：必须有复现信号、单一 canonical owner、明确 fix boundary 和验证路径。命中 shared / core / contract / fallback / adapter / duplicate owner 风险时走标准路径。

---

[workflow-state:no_task]
没有 active work。先判断用户诉求属于 roadmap / feature / issue / refactor。
如果是 feature，读取当前 host 投影中的 `cs-feat/SKILL.md`，创建或激活 feature work item 后进入 design。
如果是 issue，读取当前 host 投影中的 `cs-issue/SKILL.md`；标准路径创建或激活 issue work item 后进入 report（workflow status `design`），快速通道创建或激活 issue work item 后直接进入 quick-lane fix（workflow status `implement` + `artifacts.fix.quick_lane=true`）。
[/workflow-state:no_task]

[workflow-state:design]
active work 处于 design。feature mode 读取当前 host 投影中的 `cs-feat-design/SKILL.md`。
issue mode 读取当前 host 投影中的 `cs-issue-report/SKILL.md`，只记录现象；快速通道不进入 design 状态。
feature mode 没有 approved design 或明确的轻量跳过确认，不允许进入 implement。issue mode 标准路径没有 confirmed report 不允许进入 implement；快速通道必须已有用户确认、`artifacts.fix.quick_lane=true` 和 fix boundary。
[/workflow-state:design]

[workflow-state:implement]
active work 处于 implement。feature mode 读取当前 host 投影中的 `cs-feat-impl/SKILL.md`。
issue mode 标准路径读取当前 host 投影中的 `cs-issue-analyze/SKILL.md`，按 debugging-governance 找 root cause 和 canonical owner；快速通道读取 `cs-issue-fix/SKILL.md`，直接执行 quick-lane fix。
feature mode 按 approved design 实现；issue 标准路径不改代码，只产出 confirmed analysis；issue 快速通道只按已确认根因和 fix boundary 修复。范围不要扩散。
[/workflow-state:implement]

[workflow-state:verify]
active work 处于 verify。feature mode 读取当前 host 投影中的 `cs-feat-accept/SKILL.md`。
issue mode 标准路径读取当前 host 投影中的 `cs-issue-fix/SKILL.md`，执行修复前 gate、验证和 Debugging Closure。
feature mode 对照 design 和 checklist 验收；issue 标准路径对照 report / analysis / debugging-governance 验证。验收或修复闭环通过后才能进入 done。
[/workflow-state:verify]

[workflow-state:done]
active work 已完成。总结结果；有长期价值的事实再写 memory；如果有 parent roadmap，控制权交还 roadmap resolver。
[/workflow-state:done]
