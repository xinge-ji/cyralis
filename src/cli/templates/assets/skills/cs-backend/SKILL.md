---
name: cs-backend
description: 后端领域辅助技能。用于 feature / issue / refactor 流程中需要处理 API、domain、application、persistence、job、adapter、权限、事务、幂等、错误语义或后端验证时；不单独接管 Cyralis workflow status。
---

# cs-backend

## 启动必读

`cs-backend` 是领域辅助技能，不是新的主流程。主流程仍然是 `cs-feat` / `cs-issue` / `cs-refactor`，`work.json` 仍由这些流程管理。

本技能只回答一件事：当本轮工作触及后端责任时，如何把 owner、contract、实现边界和验证证据做干净。

借鉴 t-tools 的地方：

- 领域边界清楚：dev / test / accept 的关注点不要混在一起
- 验收必须有证据：文件、命令、测试、日志或人工复现步骤
- 修复后必须说明补测：不要只说"改好了"
- accept 姿态默认只读：除非用户明确要求修，否则先出发现和证据

不借鉴的地方：

- 不绑定 Rust / Axum / SQL / OpenAPI
- 不规定固定目录、框架、测试命令或 API client 生成流程
- 不创建 phase / slot / item DAG
- 不写 `.cyralis` workflow status

详细检查口径见同目录 `reference.md`。共享路径与工作流规则见 `.cyralis/reference/paths-and-naming.md`、`.cyralis/reference/feature-design-contract.md` 和 `.cyralis/reference/issue-debugging-principles.md`。跨层 contract / payload / projection 风险按 `.cyralis/reference/cross-layer-thinking.md`，复用 / shared owner / duplicate helper 风险按 `.cyralis/reference/code-reuse-thinking.md`。

---

## 什么时候用

命中任一信号时读取本技能：

- 新增或修改 API、RPC、CLI command、event handler、job、worker、webhook
- 修改 domain model、application service、repository、persistence、migration、cache、queue
- 涉及权限、tenant / workspace / user 边界、事务、幂等、重试、并发、错误语义
- 涉及后端到 UI / CLI / worker / generated host projection 的 contract、payload、event、config 或 runtime parser
- issue 根因疑似在 server-side owner、data contract、integration adapter、fallback 或 source-of-truth
- feature design 需要后端切片，或 acceptance 需要后端验收证据

不要因为项目里有 `backend/` 目录就自动使用。只有本轮工作实际触及后端责任时才用。

---

## 三种工作姿态

### 1. Design Assist

用于 `cs-feat-design` 或 `cs-roadmap` 中补后端切片。

输入：

- 用户目标、requirement / roadmap / design 草稿
- `.cyralis/architecture/` 相关后端现状
- 现有代码 owner 和接口落点

输出给主流程的内容：

- canonical owner：domain / application / API / persistence / job / adapter 中谁负责
- contract：输入、输出、错误语义、权限边界、数据边界、兼容边界
- orchestration：主流程、事务边界、幂等 / 重试 / 并发规则
- mount points：endpoint / command / job / event subscription / config / migration 等真正拔掉后能力会消失的点
- verification hints：最小必要单测、集成测试、contract check、migration check 或人工验证

不要在本姿态写具体代码实现方案到函数级，也不要替主流程批准 design。

### 2. Implementation Assist

用于 `cs-feat-impl`、`cs-issue-fix` 或 `cs-refactor` 中实际改后端代码。

执行原则：

- 先确认 owner，再改代码；不要在 caller / adapter / fallback 上补症状
- 按项目现有架构落位，不引入新框架或新目录体系
- 只改当前 design / analysis / refactor-design 声明的范围
- 发现需要扩大 Fix Boundary 或改变 design，停下回主流程确认
- 测试只补最小必要证据，不为了覆盖率制造低价值测试

完成时必须返回 `Backend Completion Report`，格式见下方。

### 3. Acceptance Assist

用于 `cs-feat-accept`、`cs-audit` 或用户要求后端检查时。

默认只读。先核对后端实现是否满足 design / report / architecture，而不是直接修。

检查内容：

- contract 是否和 design / requirement 一致
- owner 是否正确，有无 duplicate owner / fallback 增长
- 权限、数据边界、事务、幂等、错误语义是否有证据
- 测试 / 验证命令是否覆盖关键行为
- migration / persistence / cache / queue 变更是否有回滚或兼容说明

发现 P0 / P1 时不要在报告里轻描淡写。给出证据和建议路由：`cs-issue`、回 `cs-feat-impl`、或 `cs-refactor`。

---

## 启动流程

1. 读主流程当前输入：
   - feature：`work.json`、design、checklist、implementation report 或 acceptance 草稿
   - issue：report / analysis / quick-lane boundary
   - refactor：scan / refactor-design / checklist
2. 读 `.cyralis/architecture/ARCHITECTURE.md` 和相关 architecture doc。
3. 检索 `.cyralis/compound/` 中相关 decision / trick / explore / learning，避免违背既有约定：

   ```bash
   python .cyralis/tools/search-yaml.py --dir .cyralis/compound --query "{backend keyword}"
   ```

4. 读真实代码和测试入口。事实以代码、架构文档和已确认的 spec 为准。
5. 如果本轮改变跨层 contract / payload / event / config / generated template / runtime parser，读取 `.cyralis/reference/cross-layer-thinking.md`。
6. 如果本轮要新增 helper / utility / adapter / decoder / normalizer / projection / constant，或有重复后端逻辑，读取 `.cyralis/reference/code-reuse-thinking.md`。
7. 明确本轮姿态：Design Assist / Implementation Assist / Acceptance Assist。

---

## 后端责任切分

判断 owner 时按这个顺序向上找：

| 层级 | 典型责任 | 不该做的事 |
|---|---|---|
| API / transport | 协议适配、认证入口、request/response mapping | 写业务规则、复制 domain 校验 |
| application / service | use case 编排、事务边界、权限调用、领域对象协调 | 持久化细节散落、HTTP 语义泄漏 |
| domain | 不变量、状态转换、核心规则 | 读取 HTTP / DB / env / clock 等外部细节 |
| persistence / repository | query、transaction、migration、storage mapping | 决定业务是否允许 |
| job / event / integration | 异步编排、第三方适配、重试、幂等 key | 成为第二套 source-of-truth |
| shared / util | 真正跨领域且稳定的通用能力 | 收容业务规则 |

命中 caller patch、adapter patch、fallback patch、regex / keyword patch、local guard patch 时，先按 `.cyralis/reference/issue-patch-shape.md` 做 Patch-Shape Triage。

---

## 设计检查清单

用于补 `cs-feat-design` 第 2 / 3 节，不单独落状态：

- [ ] Owner：谁是 canonical owner，有无现有 owner 可以复用
- [ ] Contract：输入、输出、错误、权限、兼容边界清楚
- [ ] Data boundary：tenant / user / workspace / organization / project 等隔离条件明确
- [ ] Transaction：哪些写入必须同成同败，哪些可异步补偿
- [ ] Idempotency：重复请求、重试、job 重放、webhook 重投有规则
- [ ] Concurrency：并发写、状态流转冲突、锁 / version / unique constraint 策略明确
- [ ] Observability：失败可定位，关键路径有日志 / metric / trace 或项目等价机制
- [ ] Migration：schema / data migration / compatibility / rollback 风险已说明
- [ ] Verification：每个关键行为有可观察证据，不把"测试会补"当证据

---

## 实现约束

- 不顺手重构不相关后端代码。
- 不新增全局 helper / shared util 来承载单一业务规则。
- 不把权限或数据边界只放在 UI / caller 层。
- 不新增 fallback / adapter 而不写 retention reason 和 retirement trigger。
- 不修改测试语义来迎合实现，除非主流程明确批准 spec 变更。
- 不把外部依赖文档当项目事实；先读本仓库现有用法。

---

## Backend Completion Report

实现或修复完成时，用这个结构回主流程：

```markdown
## Backend Completion Report

### Scope
- Mode: design-assist | implementation-assist | acceptance-assist
- Upstream: {feature / issue / refactor path}
- Backend owner: {API / application / domain / persistence / job / adapter}

### Changes
- Files changed: {git status / paths}
- Contracts changed: {yes/no + summary}
- Data / permission boundary changed: {yes/no + summary}
- Migration / persistence changed: {yes/no + summary}

### Validation
- Commands run:
  - `{command}` -> passed | failed | not run
- Behavior evidence:
  - {scenario / invariant}: {test / command / manual evidence}
- Missing evidence:
  - {none or explicit gap}

### Tests To Run
- Required:
  - `{command}` — {why this covers the backend change}
- Optional:
  - `{command}` — {why useful but not blocking}

### Risks / Follow-ups
- P0/P1/P2: {issue + evidence + suggested route}
```

If no command can be run, explain the concrete blocker and provide the smallest manual verification path.

---

## Acceptance Report Shape

只读检查时按这个格式给结论：

```markdown
## Backend Acceptance Findings

Verdict: passed | failed | partial

Findings:
- Severity: P0 | P1 | P2
  Area: contract | owner | data-boundary | permission | transaction | idempotency | migration | validation
  Evidence: {file:line / command / log / spec section}
  Impact: {what can go wrong}
  Recommendation: {cs-issue / cs-feat-impl / cs-refactor / cs-arch}

Validation Reviewed:
- `{command}` -> result
- {manual evidence}

Open Gaps:
- {none or explicit}
```

---

## 退出条件

- [ ] 已明确本轮姿态，不篡改主流程状态
- [ ] 已定位 canonical owner，并说明 contract / data boundary / validation
- [ ] 实现姿态下已给 `Backend Completion Report`
- [ ] 验收姿态下已给只读 findings，P0/P1 有证据和路由
- [ ] 未引入框架专用流程或项目外产品边界
