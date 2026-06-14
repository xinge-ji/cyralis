---
name: cs-ui
description: UI 领域辅助技能。用于 feature / issue / refactor 流程中需要处理页面、路由、组件、hook、state、form、API client、可见状态、交互、可访问性或 UI 验证时；不单独接管 Cyralis workflow status。
---

# cs-ui

## 启动必读

`cs-ui` 是领域辅助技能，不是新的主流程。主流程仍然是 `cs-feat` / `cs-issue` / `cs-refactor`，`work.json` 仍由这些流程管理。

本技能只回答一件事：当本轮工作触及用户界面或前端应用责任时，如何把用户路径、UI owner、状态模型、实现边界和验证证据做干净。

借鉴 t-tools 的地方：

- UI dev / test / accept 的责任分开想
- 交互必须落到可观察证据，不用 "typecheck 通过" 代替用户路径
- 修复后必须说明补测命令和手工路径
- accept 姿态默认只读，先出证据和结论

不借鉴的地方：

- 不绑定 React / Vue / Svelte / Tailwind / Playwright
- 不规定固定目录、组件库、测试框架或 E2E 流程
- 不创建 phase / slot / item DAG
- 不写 `.cyralis` workflow status

详细检查口径见同目录 `reference.md`。共享路径与工作流规则见 `.cyralis/reference/paths-and-naming.md`、`.cyralis/reference/feature-design-contract.md` 和 `.cyralis/reference/issue-debugging-principles.md`。跨层 contract / payload / projection 风险按 `.cyralis/reference/cross-layer-thinking.md`，复用 / shared component / duplicate state 风险按 `.cyralis/reference/code-reuse-thinking.md`。

---

## 什么时候用

命中任一信号时读取本技能：

- 新增或修改页面、route、screen、component、form、modal、table、navigation、wizard
- 修改 hook、client-side state、cache key、API client mapping、schema、validation、permission rendering
- 涉及 loading / empty / error / disabled / optimistic / offline / permission states
- 涉及 UI 到 API client / backend / generated host projection 的 payload、event、config、schema 或 runtime parser
- issue 根因疑似在 UI state、event flow、rendering, form schema、routing、cache、API mapping
- feature design 需要 UI 切片，或 acceptance 需要浏览器 / UI 证据

不要因为项目里有 `frontend/` 或 `ui/` 目录就自动使用。只有本轮工作实际触及 UI 责任时才用。

---

## 三种工作姿态

### 1. Design Assist

用于 `cs-feat-design` 或 `cs-roadmap` 中补 UI 切片。

输入：

- 用户目标、requirement / roadmap / design 草稿
- `.cyralis/architecture/` 相关 UI / app 现状
- 现有 route / component / state / API client 落点

输出给主流程的内容：

- user journey：入口、主路径、退出路径、失败路径
- UI owner：route / page / component / hook / state / API client / schema 中谁负责
- state model：loading、empty、error、success、disabled、permission、dirty、saving 等状态
- interaction contract：用户动作、可见反馈、错误恢复、键盘 / 焦点 / a11y 边界
- mount points：route、menu、button、form field、feature flag、API client binding 等真正拔掉后能力会消失的点
- verification hints：component / hook / integration test、manual browser path、E2E candidate

不要在本姿态写具体 JSX / template / CSS 级实现，也不要替主流程批准 design。

### 2. Implementation Assist

用于 `cs-feat-impl`、`cs-issue-fix` 或 `cs-refactor` 中实际改 UI 代码。

执行原则：

- 先确认 UI owner，再改代码；不要把状态修在展示层的临时 guard 上
- 按项目现有 framework、design system、routing、state 和 test pattern 落位
- 先稳定结构和状态，再补视觉细节
- 只改当前 design / analysis / refactor-design 声明的范围
- 发现需要扩大 boundary 或改变 design，停下回主流程确认
- 测试只补能证明行为的最小必要证据，不断言组件库或浏览器已保证的行为

完成时必须返回 `UI Completion Report`，格式见下方。

### 3. Acceptance Assist

用于 `cs-feat-accept`、`cs-audit` 或用户要求 UI 检查时。

默认只读。先核对 UI 实现是否满足 design / report / architecture，而不是直接修。

检查内容：

- 用户路径是否可走通，关键状态是否可观察
- UI owner 是否正确，有无 duplicate state / duplicate API mapping
- loading / empty / error / permission / disabled / success 状态是否完整
- 表单 schema、client validation、server error mapping 是否一致
- 测试 / 手工验证是否覆盖关键行为
- a11y / keyboard / focus / responsive 是否在本 feature 风险范围内有证据

发现 P0 / P1 时给出证据和建议路由：`cs-issue`、回 `cs-feat-impl`、或 `cs-refactor`。

---

## 启动流程

1. 读主流程当前输入：
   - feature：`work.json`、design、checklist、implementation report 或 acceptance 草稿
   - issue：report / analysis / quick-lane boundary
   - refactor：scan / refactor-design / checklist
2. 读 `.cyralis/architecture/ARCHITECTURE.md` 和相关 UI / app architecture doc。
3. 检索 `.cyralis/compound/` 中相关 decision / trick / explore / learning：

   ```bash
   python .cyralis/tools/search-yaml.py --dir .cyralis/compound --query "{ui keyword}"
   ```

4. 读真实代码、route tree、component entry、state owner、API client 和测试入口。
5. 如果本轮改变 UI/API contract、payload、event、config、schema、cache projection、generated template 或 runtime parser，读取 `.cyralis/reference/cross-layer-thinking.md`。
6. 如果本轮要新增 shared component / hook / utility / API adapter / decoder / normalizer / projection / constant，或有重复 UI state / duplicate component，读取 `.cyralis/reference/code-reuse-thinking.md`。
7. 明确本轮姿态：Design Assist / Implementation Assist / Acceptance Assist。

---

## UI 责任切分

判断 owner 时按这个顺序向上找：

| 层级 | 典型责任 | 不该做的事 |
|---|---|---|
| route / page / screen | 页面入口、布局级数据需求、权限入口、导航语义 | 持有所有细粒度交互状态 |
| feature component | 用户可见工作流、局部组合、表单提交、主要状态反馈 | 复制 API mapping 或全局规则 |
| shared component | 稳定可复用的展示 / input primitive | 承载业务规则 |
| hook / composable | 状态机、side effect、query / mutation orchestration | 变成无边界 util bucket |
| API client / adapter | request / response mapping、server error normalization | 决定产品语义或隐藏 server contract drift |
| schema / validation | client-side input shape and local validation | 替代 server authorization or source-of-truth rules |
| store / cache | cross-screen state, cache key, invalidation | 收容一次性页面状态 |

命中 local guard、presentation-only patch、duplicate state、downstream re-parse、fallback branch 时，按 `.cyralis/reference/issue-patch-shape.md` 做 Patch-Shape Triage。

---

## 设计检查清单

用于补 `cs-feat-design` 第 2 / 3 节，不单独落状态：

- [ ] Entry：用户从哪里进入，失败后如何退出或重试
- [ ] Journey：正常路径、关键错误路径、空数据路径、权限路径明确
- [ ] State model：loading / empty / error / success / disabled / permission / saving / dirty
- [ ] Data ownership：server state、client state、form state、derived state 分清
- [ ] API mapping：请求参数、响应转换、错误映射、cache invalidation 清楚
- [ ] Interaction：点击、输入、提交、撤销、重试、取消、焦点和键盘边界明确
- [ ] Responsive / a11y：只在本 feature 风险范围内写具体要求，不泛泛列 checklist
- [ ] Mount points：route / menu / button / form field / flag / client binding 真正可卸载
- [ ] Verification：每个关键 UI 行为有测试或人工路径，不用 typecheck 替代

---

## 实现约束

- 不新增平行组件体系、样式体系或状态库。
- 不把 server authorization / data boundary 当成 UI-only rule。
- 不为了测试方便暴露用户不可见的实现细节。
- 不断言 CSS class、DOM 结构或组件库默认行为，除非本 feature 的 contract 就是这些。
- 不通过 `setTimeout` / arbitrary wait / local guard 掩盖状态 owner 问题。
- 不把所有状态堆到 page 或 global store；先找最小正确 owner。
- 不引入新图标、组件库或设计 token 体系，除非 design 已批准。

---

## UI Completion Report

实现或修复完成时，用这个结构回主流程：

```markdown
## UI Completion Report

### Scope
- Mode: design-assist | implementation-assist | acceptance-assist
- Upstream: {feature / issue / refactor path}
- UI owner: {route / page / component / hook / state / API client / schema}

### Changes
- Files changed: {git status / paths}
- User-visible behavior changed: {yes/no + summary}
- State model changed: {yes/no + summary}
- API / cache / schema changed: {yes/no + summary}

### Validation
- Commands run:
  - `{command}` -> passed | failed | not run
- Browser / manual evidence:
  - {path}: {observed result}
- Test evidence:
  - {scenario / invariant}: {test / command}
- Missing evidence:
  - {none or explicit gap}

### Tests To Run
- Required:
  - `{command}` — {why this covers the UI change}
- Manual:
  - {route / user path / viewport or state} — {why required}
- Optional:
  - `{command}` — {why useful but not blocking}

### Risks / Follow-ups
- P0/P1/P2: {issue + evidence + suggested route}
```

If no browser or app runtime can be used, explain the blocker and provide the smallest reviewable fallback evidence.

---

## Acceptance Report Shape

只读检查时按这个格式给结论：

```markdown
## UI Acceptance Findings

Verdict: passed | failed | partial

Findings:
- Severity: P0 | P1 | P2
  Area: journey | state | owner | form | api-mapping | permission | accessibility | responsive | validation
  Evidence: {file:line / command / screenshot path / manual path / spec section}
  Impact: {what user-visible behavior can go wrong}
  Recommendation: {cs-issue / cs-feat-impl / cs-refactor / cs-arch}

Validation Reviewed:
- `{command}` -> result
- Manual path: {route + steps + observed result}

Open Gaps:
- {none or explicit}
```

---

## 退出条件

- [ ] 已明确本轮姿态，不篡改主流程状态
- [ ] 已定位 UI owner，并说明 user journey / state model / validation
- [ ] 实现姿态下已给 `UI Completion Report`
- [ ] 验收姿态下已给只读 findings，P0/P1 有证据和路由
- [ ] 未引入框架专用流程或项目外产品边界
