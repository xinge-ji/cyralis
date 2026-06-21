---
name: cs-feat-review
description: feature 流程阶段 2.5——实现完成后的本地代码审查 gate。对照 design / checklist / 实现汇报和当前 git diff 做只读 code review，产出 {slug}-review.md；默认不检测、不启动、不路由任何外部 agent/provider。有 blocking findings 时回到 cs-feat-impl 的 review-fix，通过后进入 cs-feat-qa，不直接验收。触发：用户说"做代码审查"、"review 这个 feature"、"实现完了先 code review"、"跑 cs-feat-review"。
---

# cs-feat-review

## 启动必读

开始任何判断或动作前，先读取 `.cyralis/attention.md`。

本阶段是实现完成后、QA 前的独立代码审查 gate。它只读代码和产物，只写 `{slug}-review.md`，不直接修代码、不更新 checklist、不改 design、不替代 QA 或 acceptance。

审查目标不是追求完美代码，而是确认本次改动没有降低系统代码健康，并且确实朝 design 的目标前进。能自动格式化或 lint 的问题不要手工阻塞；会影响正确性、维护性、安全、性能、可测试性、需求满足或后续验收可信度的问题必须指出。

> 共享路径与命名约定看 `.cyralis/reference/shared-conventions.md` 第 0 节。

---

## 输入

进入 review 前必须读取：

- `.cyralis/attention.md`
- `{slug}-design.md`
- `{slug}-checklist.yaml`
- 实现完成汇报 / 最近实现记录（如果在对话里，按对话事实引用；如果已落文件，读文件）
- `git status --short`
- `git diff`（有 staged diff 时也读 `git diff --cached`）
- diff 涉及的人写代码文件和相邻关键调用点
- design 第 4 节指向的 architecture / requirement / roadmap 相关文档（只读，判断改动是否会影响归并）
- 用户显式提供的外部审查材料（如果有；只作为附加输入）

如果工作区有 feature 外的既有 dirty 文件，先记录为 baseline/无关变更；审查结论只针对本 feature 可归因的改动。无法区分归因时写成 `residual-risk`，不要把不确定当通过。

---

## 启动检查

1. `{slug}-design.md` 存在，frontmatter `doc_type=feature-design`、`status=approved`、`feature` 与目录一致。
2. `{slug}-checklist.yaml` 存在，`steps` 全部 `done`，`checks` 仍处于验收前状态（通常是 `pending`）。
3. 当前 diff 能看到本 feature 的实现改动；如果完全没有代码或产物改动，退回 `cs-feat-impl`。
4. 如果已有 `{slug}-review.md`：
   - `status: passed` 且 diff 未变化：提示可进入 `cs-feat-qa`。
   - `status: changes-requested` / `blocked`：读取旧 findings，确认是否处于 review-fix 后的复审。
   - diff 已变化：重新 review，并在报告里记录这是第几轮。

---

## 本地审查边界

本阶段默认且完整地由当前 agent 做本地只读 review。不要检测、启动或路由 Paseo、Claude、Codex、OpenCode、Gemini、Aider 或任何其他外部 agent / provider；这属于 Cyralis 产品边界之外。

如果用户显式提供外部审查材料，把它当作附加输入，而不是权威结论。必须逐条用本地 design、checklist、diff、代码事实核验后才能合并进 `{slug}-review.md`；证据不足的内容只能写为 `residual-risk` 或忽略。

如果用户要求你主动调用某个外部 reviewer，先说明本技能模板默认 `local-only`，请用户单独运行外部审查并把结果带回，或明确改变产品边界后再继续。

## 审查流程

### 1. 上下文与范围

- 用 design 第 1/2/3 节确认目标、明确不做、关键决策、验收场景。
- 用 checklist steps 确认实现声称已经完成的范围。
- 用 `git status` / `git diff` 列出真实改动文件，标出新增、修改、删除、未跟踪、staged。
- 判断 diff 大小和风险：跨模块、跨边界、数据迁移、权限/安全、并发/异步、用户可见 UI、公共 API、测试缺口。

### 2. 外部材料核验（可选）

- 默认记录 `External review material: none`，本地 review 可以定稿。
- 用户提供外部审查材料时，记录来源和摘要。
- 对外部材料里的每条 finding 做本地事实核验；能复现 / 有证据才合并。
- 证据不足的外部结论只写 `residual-risk` 或不采纳。
- 报告里保留来源：哪些 finding 来自外部材料，哪些是本地 review 发现。

### 3. 整体审查

先看整体，再看行级细节：

- design fit：实现是否满足 design，又没有偷偷扩范围。
- 架构 fit：新代码是否放在正确层次，是否绕过既有抽象、引入反向依赖或过度耦合。
- 复杂度：是否为当前问题引入过度泛化、补丁分支、参数膨胀、大函数/大类继续膨胀。
- 测试策略：现有测试和新增测试是否能证明关键场景；测试是否会在代码坏掉时真实失败。
- 风险面：错误处理、数据校验、安全边界、权限、并发、幂等、性能、可观测性、回滚/卸载。
- 文档/归并影响：是否出现 acceptance 必须回写的 architecture / requirement / roadmap 变更。

### 4. 行级审查

对人写代码逐文件审查，至少覆盖：

- 逻辑正确性：边界值、空值、异常路径、状态转换、时序问题、off-by-one。
- 错误处理：错误语义是否明确，是否吞错，是否把恢复逻辑和业务逻辑搅在一起。
- 数据与安全：输入验证、注入风险、敏感信息、权限检查、跨租户/跨用户隔离。
- 性能与资源：重复 IO、N+1、无界循环/缓存、内存泄漏、未释放资源。
- 并发/异步：竞态、死锁、取消、重入、重复提交、幂等。
- 可维护性：命名是否沿用 design 术语，是否复用已有 helper，是否新增重复逻辑。
- 清洁度：调试输出、临时 TODO/FIXME、注释掉代码、未使用 import、方案外文件。

生成代码、锁文件、大数据文件可以抽样，但报告里要说明抽样范围。人写业务代码不能跳过不看。

### 5. 结论

把发现按严重度归类，并给出明确 verdict：

- `passed`：没有 blocking；important 已修复、无重要项、或用户明确接受延后。
- `changes-requested`：有 blocking，或 important 多到会影响验收可信度。
- `blocked`：缺少关键输入、diff 归因无法判断、设计/实现状态不满足 review 前置条件。

---

## 严重度

- `blocking`：必须先修。会导致功能不满足 design、数据/安全/权限风险、明显 bug、验收无法可信执行、严重架构倒退、测试完全覆盖不到关键风险。
- `important`：应该修；若用户决定延后，必须在 review 报告和 acceptance residual risk 中明确记录。
- `nit`：小的清晰度或一致性建议，不阻塞。
- `suggestion`：替代实现思路，不要求本次采用。
- `learning`：知识性说明，不要求动作。
- `praise`：记录值得保留的好做法；少量即可。
- `residual-risk`：review 无法完全消除的不确定性，需要 QA / acceptance 重点复核。

不要把个人偏好升级成 blocking。blocking 必须能用仓库事实、design 契约、可靠工程原则或可复现实例支撑。

---

## 报告模板

报告路径：`.cyralis/features/{feature}/{slug}-review.md`。

```markdown
---
doc_type: feature-review
feature: YYYY-MM-DD-slug
status: passed|changes-requested|blocked
reviewed: YYYY-MM-DD
round: 1
---

# {slug} 代码审查报告

## 1. Scope And Inputs

- Design: {path}
- Checklist: {path}
- Implementation evidence: {实现汇报 / 对话 / 文件}
- Diff basis: {git status / git diff 摘要}
- Baseline dirty files: {none / 列表 + 归因}

### External Review Material

- Status: none|provided-by-user
- Source: {路径 / 对话摘要 / none}
- Merge policy: {local-only / 已逐条本地核验}
- Gate effect: none

## 2. Diff Summary

- 新增：{文件列表}
- 修改：{文件列表}
- 删除：{文件列表}
- 未跟踪 / staged：{文件列表}
- 风险热点：{跨模块 / 权限 / 数据 / 并发 / UI / API / none}

## 3. Findings

### blocking

- [ ] REV-001 `{file:line}` {问题}
  - Evidence: {仓库事实 / design 契约 / 失败路径}
  - Impact: {为什么阻塞 QA / acceptance}
  - Expected fix scope: {只描述问题边界，不替实现写方案}

### important

- [ ] REV-00N `{file:line}` {问题}
  - Evidence: {证据}
  - Impact: {影响}

### nit

- [ ] REV-00N `{file:line}` {建议}

### suggestion

- [ ] REV-00N {建议}

### learning

- {可复用经验或注意点}

### praise

- {值得保留的做法}

## 4. Test And QA Focus

- QA 必须重点复核：{场景 / 命令 / 手工验证}
- 建议新增或加强的测试：{unit / integration / e2e / function / none}
- 不能靠 review 完全确认的点：{列表}

## 5. Residual Risk

- {风险 + QA / acceptance 如何处理；没有写 none}

## 6. Verdict

- Status: passed|changes-requested|blocked
- Next: `cs-feat-qa` | `cs-feat-impl` review-fix | 补齐输入后重跑 `cs-feat-review`
```

没有某类 finding 时写 `none`，不要删除章节；下一轮复审要能对比。

---

## review-fix 衔接

如果有 `blocking`：

1. 报告 `status: changes-requested`。
2. 告诉用户下一步触发 `cs-feat-impl` 的 review-fix 模式。
3. review-fix 只修 blocking findings；important 是否修由用户或实现者判断，但不能顺手扩大范围。
4. review-fix 完成后必须重跑 `cs-feat-review`，不能直接进入 `cs-feat-qa` 或 `cs-feat-accept`。

如果只有 `important`：

- 默认建议先修；如果用户明确接受延后，报告里把它移入 residual risk，并允许进入 `cs-feat-qa`。

如果没有 blocking，且 important 已处理或被明确接受：

- 报告 `status: passed`。
- 告诉用户下一步是 `cs-feat-qa`。

---

## 退出条件

- [ ] 已读取 attention、design、checklist、实现证据、git status、git diff 和相关代码。
- [ ] 已确认 checklist steps 全 done；否则退回 `cs-feat-impl`。
- [ ] 未检测、启动或路由外部 agent/provider。
- [ ] 用户提供外部审查材料时，已逐条本地核验后再合并 / 驳回 findings。
- [ ] 已做整体审查和行级审查。
- [ ] 已明确区分 blocking / important / nit / suggestion / learning / praise / residual-risk。
- [ ] 已写 `.cyralis/features/{feature}/{slug}-review.md`。
- [ ] 有 blocking 时没有进入 QA / acceptance，而是指向 `cs-feat-impl` review-fix。
- [ ] 无 blocking 时明确告诉用户下一步 `cs-feat-qa`。

---

## 容易踩的坑

- 边 review 边修代码，把只读 gate 变成实现阶段。
- 只看实现汇报，不看真实 `git diff`。
- 只看测试是否通过，不判断测试是否有效。
- 把格式、命名偏好、个人写法升级成 blocking。
- 发现设计外实现却不回到 design 契约判断。
- 外部审查材料没经本地事实核验就直接照抄成 blocking。
- 自动检测或启动外部 agent/provider，把本地 review gate 变成模型路由。
- blocking 修完后跳过复审，直接验收。
- review 报告没有落盘，导致 acceptance 没有可追溯输入。
