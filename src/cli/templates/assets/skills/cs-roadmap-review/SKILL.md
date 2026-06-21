---
name: cs-roadmap-review
description: roadmap 人工确认前的规划审查 gate。对照 roadmap 主文档、items.yaml、相关 requirement / architecture / compound / 代码事实做本地只读 review，产出 {slug}-roadmap-review.md；默认不检测、不启动、不路由任何外部 agent/provider。触发：用户说"review 这个 roadmap"、"roadmap 人审前先审查"、"跑 cs-roadmap-review"、"规划审查"。
---

# cs-roadmap-review

## 启动必读

开始任何判断或动作前，先读取 `.cyralis/attention.md`。

本阶段是 roadmap 交给用户人工确认前的规划审查 gate。它只读 roadmap、items、相关文档和必要代码事实，只写 `{slug}-roadmap-review.md`，不直接改 roadmap、不替用户批准 roadmap、不推进 feature design。

目标不是追求"规划看起来完整"，而是确认这份 roadmap 已经具备让用户有效 review 的条件：目标可证伪、范围边界清楚、模块拆分与接口契约可执行、子 feature 可独立验证、依赖 DAG 合理、风险和验证策略提前暴露。

> 共享路径与命名约定看 `.cyralis/reference/shared-conventions.md`。roadmap 的具体结构以目标 `{slug}-roadmap.md` / `{slug}-items.yaml` 和项目内共享口径为准。

---

## 输入

进入 review 前必须读取：

- `.cyralis/attention.md`
- `.cyralis/roadmap/{slug}/{slug}-roadmap.md`
- `.cyralis/roadmap/{slug}/{slug}-items.yaml`
- roadmap 目录下相关 `drafts/` 材料（只读与本次候选直接相关的）
- roadmap frontmatter 指向的 requirement / architecture 文档
- roadmap 第 7 节观察项提到的相关文档
- 相关 compound 沉淀：用项目搜索工具按大需求关键词检索 decision / learning / explore / trick
- items.yaml 中已存在 `feature` 字段的 feature design / acceptance（update 模式或复审时）
- roadmap 中接口契约或模块拆分引用到的关键代码位置
- 用户显式提供的外部审查材料（如果有；只作为附加输入）

没有代码引用时不强行扫全仓库；但 roadmap 声称复用现有模块、接口、命令、配置或数据结构时，必须读对应代码或文档事实核验。

---

## 启动检查

1. roadmap 主文档存在，frontmatter `doc_type=roadmap`，`slug` 与目录一致，`status` 是 `draft|active|paused|completed` 之一。
2. items.yaml 存在，`roadmap` 与 slug 一致，`items` 非空。
3. items.yaml 每条有 `slug` / `description` / `depends_on` / `status` / `feature` / `minimal_loop`。
4. 依赖图能解析；有循环、自指、未知依赖时直接列 blocking。
5. 如果已有 `{slug}-roadmap-review.md`：
   - `status: passed` 且 roadmap/items 未变化：提示可进入用户 review。
   - `status: changes-requested` / `blocked`：读取旧 findings，确认是否复审。
   - roadmap/items 已变化：重新 review，并在报告里记录轮次。

---

## 本地审查边界

本阶段默认且完整地由当前 agent 做本地只读 roadmap review。不要检测、启动或路由 Paseo、Claude、Codex、OpenCode、Gemini、Aider 或任何其他外部 agent / provider；这属于 Cyralis 产品边界之外。

如果用户显式提供外部审查材料，把它当作附加输入，而不是权威结论。必须逐条用本地 roadmap、items、相关文档和代码事实核验后才能合并进 `{slug}-roadmap-review.md`；证据不足的内容只能写为 `residual-risk` 或忽略。

如果用户要求你主动调用某个外部 reviewer，先说明本技能模板默认 `local-only`，请用户单独运行外部审查并把结果带回，或明确改变产品边界后再继续。

---

## 审查流程

### 1. 范围与事实

- 用 roadmap 第 1/2 节确认目标、覆盖范围、明确不做、关键假设。
- 用第 3/4 节确认模块拆分和接口契约是否足够支撑多个 feature 共用。
- 用第 5 节和 items.yaml 对齐所有子 feature：slug、描述、所属模块、依赖、状态、feature 绑定、minimal_loop。
- 用相关 req / arch / compound 判断有没有冲突、重复规划或遗漏约束。
- 用代码事实核验 roadmap 对现有模块、命令、接口、配置、数据结构的描述。

### 2. 外部材料核验（可选）

- 默认记录 `External review material: none`，本地 review 可以定稿。
- 用户提供外部审查材料时，记录来源和摘要。
- 对外部材料里的每条 finding 做本地事实核验；能用 roadmap / items / 文档 / 代码证据支撑才合并。
- 证据不足的外部结论只写 `residual-risk` 或不采纳。
- 报告里保留来源：哪些 finding 来自外部材料，哪些是本地 review 发现。

### 3. 规划审查

至少覆盖：

- 目标完成信号：是否能观察、能验收、能判定完成 / 未完成。
- 范围与明确不做：是否具体，能否防止后续 feature 偷偷扩范围。
- 模块拆分：职责是否清楚，是否有重复模块、万能模块、遗漏模块。
- 接口契约：是否写到函数签名 / 数据结构 / 协议字段 / 错误码级别；无跨模块接口时是否明确写明。
- 子 feature 原子性：每条能否独立 design / implement / review / QA / accept；描述是否可证伪。
- 依赖 DAG：是否无环，依赖理由是否具体，最弱依赖是否先验证。
- 最小闭环：第一条或最小路径做完后是否能端到端演示。
- 验证与基线：是否识别 build / typecheck / lint / test / e2e / 手工验证入口；基线不稳时是否安排 safety net。
- 风险与恢复：Top 风险、外部依赖、迁移 / 权限 / 安全 / 回滚是否提前暴露。
- 交付物与知识回写：后续 acceptance 是否能从仓库事实核验产物；稳定约定 / 坑点是否有沉淀候选。

---

## 严重度

- `blocking`：必须先修。会导致用户无法有效 review、feature 不能独立执行、接口契约不可用、依赖循环、明显违反 req / arch、关键风险未覆盖、验收不可证伪。
- `important`：应该修；若用户决定延后，必须在 roadmap review 和用户 review 摘要中明确记录。
- `nit`：小的清晰度或一致性建议，不阻塞。
- `suggestion`：替代拆法或补强思路，不要求本次采用。
- `learning`：知识性说明，不要求动作。
- `praise`：记录值得保留的规划做法；少量即可。
- `residual-risk`：review 无法完全消除的不确定性，需要用户 review 或后续 feature-design 重点复核。

不要把个人偏好的拆法升级成 blocking。blocking 必须能用 roadmap 契约、items 事实、相关文档、代码事实或可靠工程原则支撑。

---

## 报告模板

报告路径：`.cyralis/roadmap/{slug}/{slug}-roadmap-review.md`。

```markdown
---
doc_type: roadmap-review
roadmap: {slug}
status: passed|changes-requested|blocked
reviewed: YYYY-MM-DD
round: 1
---

# {slug} roadmap 审查报告

## 1. Scope And Inputs

- Roadmap: {path}
- Items: {path}
- Related docs: {requirements / architecture / compound / drafts}
- Code facts checked: {paths / none}

### External Review Material

- Status: none|provided-by-user
- Source: {路径 / 对话摘要 / none}
- Merge policy: {local-only / 已逐条本地核验}
- Gate effect: none

## 2. Roadmap Summary

- Goal completion signal: {摘要}
- Module split: {摘要}
- Interface contracts: {摘要}
- Items: {数量 + minimal loop + 风险热点}
- Dependency shape: {DAG / 问题}

## 3. Findings

### blocking

- [ ] RMR-001 `{path#section|items.slug|file:line}` {问题}
  - Evidence: {事实}
  - Impact: {为什么阻塞用户 review / 后续 feature}
  - Expected fix scope: {修复边界}

### important

- [ ] RMR-00N `{证据位置}` {问题}
  - Evidence: {事实}
  - Impact: {影响}

### nit

- [ ] RMR-00N `{证据位置}` {建议}

### suggestion

- [ ] RMR-00N {建议}

### learning

- {可复用规划经验或注意点}

### praise

- {值得保留的做法}

## 4. User Review Focus

- 用户需要重点拍板：{决策 / 假设 / 优先级}
- 后续 feature-design 需要重点复核：{接口 / 风险 / 验证}
- 不能靠 roadmap review 完全确认的点：{列表}

## 5. Residual Risk

- {风险 + 用户 review / feature-design 如何处理；没有写 none}

## 6. Verdict

- Status: passed|changes-requested|blocked
- Next: 交给用户 review | 回 `cs-roadmap` 修订后重跑 `cs-roadmap-review` | 补齐输入后重跑
```

没有某类 finding 时写 `none`，不要删除章节；下一轮复审要能对比。

---

## 退出条件

- [ ] 已读取 attention、roadmap、items、相关 req / arch / compound / drafts。
- [ ] 已按 roadmap 声明核验必要代码或命令事实。
- [ ] 已确认 items.yaml 可解析，依赖图无未知节点；有问题已列 finding。
- [ ] 未检测、启动或路由外部 agent/provider。
- [ ] 用户提供外部审查材料时，已逐条本地核验后再合并 / 驳回 findings。
- [ ] 已审查目标、范围、模块、接口、feature 原子性、依赖、最小闭环、验证、风险、知识回写。
- [ ] 已写 `.cyralis/roadmap/{slug}/{slug}-roadmap-review.md`。
- [ ] 有 blocking / 未处理 important 时指向 `cs-roadmap` 修订并重跑 review。
- [ ] 无 blocking 且 important 已处理或明确接受时，明确告诉用户下一步是 roadmap 人工 review。

---

## 容易踩的坑

- 把 roadmap review 做成语病检查，没审接口契约和依赖图。
- 只读主文档，不核对 items.yaml。
- 不读 requirement / architecture，导致规划和现状冲突没发现。
- 接口契约写着"待定"也放过，后续每条 feature 各自发明接口。
- 子 feature 里塞多个可独立验收的交付，却只当一条。
- 自动检测或启动外部 agent/provider，把本地 review gate 变成模型路由。
- 外部审查材料没经本地事实核验就照抄。
- review 报告没有落盘，导致用户 review 和后续 design 没有可追溯输入。
