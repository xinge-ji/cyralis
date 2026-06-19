---
name: cs-issue-fix
description: issue 修复阶段——按已确认根因和方案定点修复、验证、写 {slug}-fix-note.md 落档。两个入口：标准路径从 analyze 来，快速通道从 work.json quick_lane 直接来。触发：用户说"开始修 bug"、"按分析修"、"动手改代码"。只动方案声明的文件，不顺手优化。
---

# cs-issue-fix

## 启动必读

同时读取 `.cyralis/reference/issue.md`。fix 阶段执行修复前 gate、完成前 gate、Repair Track / Retirement Track 和 confidence 口径；不要把局部补丁包装成根因修复。

根因和方案已经确定（标准路径在 analysis、快速通道在 quick-lane 启动摘要里确认过），你的活是按方案改代码、验证效果、写下修复记录。

fix 阶段最容易出问题的不是改代码本身，而是**改的过程中冒出的"顺手"冲动**——顺手优化、顺手重构、顺手加抽象。每项单独看说得通，但合在一个 PR 里让别人分不清"这次到底为了修 bug 改了什么"。

> 共享路径与命名约定看 `.cyralis/reference/core.md` 和 `cs-issue` 的"文件放哪儿"。

---

## 两种入口

### 标准路径（有 analysis）

1. **方案已确认**——读 analysis，确认 `doc_type=issue-analysis` 且 `status=confirmed`，第 5 节用户选定了哪个方案
2. **调试治理已就绪**——analysis 里应有复现信号、诊断停止层、canonical owner、Patch-Shape / Minimality 检查、confidence。confidence 低于 `B` 时只能进入 mitigation，不要宣称根因修复
3. **上下文读全**：analysis 全文 + report 全文 + analysis 里定位出的所有代码 + `.cyralis/reference/issue.md` + 沉淀目录搜索：
   - `python .cyralis/tools/search-yaml.py --dir .cyralis/compound --filter doc_type=trick --filter status=active --query "{关键词}"`——确认修复方式不违背已有库用法 / 模式
   - 同样命令换 `--filter doc_type=explore`——确认修复点和已有证据不冲突
   - 如果修复跨 2+ 层、payload / event / config / API contract / generated template / runtime parser，读取 `.cyralis/reference/shared.md`
   - 如果修复需要新增 helper / utility / adapter / decoder / normalizer / projection / constant，或会复制 / 批量修改相似逻辑，读取 `.cyralis/reference/shared.md`
4. **确认起点**——告诉用户"我将按方案 X 修改 {文件列表}，开始修复"，等用户确认才动手

### 快速通道（无 report / analysis，从 quick-lane work item 直接触发）

进入这个入口时 AI 已读过代码并对根因有把握，且满足 `.cyralis/reference/issue.md` quick lane 准入。先读 `work.json`，确认 `mode=issue`、`status=implement`、`artifacts.fix.quick_lane=true`；否则不要按快速通道执行。

1. **明确陈述根因**："`{文件}:{行号}` 的 {具体代码} 存在 {问题描述}"，让用户确认根因判断准确
2. **给修复方案和 Fix Boundary**——改哪里、怎么改、只允许动哪些文件（一两句话，不写完整分析文档）
3. **等用户明确说"对，就这样改"才动手**——不允许"我觉得对，直接改了"
4. 读 issue 调试 reference：`.cyralis/reference/issue.md`
5. **补搜沉淀目录**——快速通道也要查一遍 `compound/`（trick + explore），避免误把已知边界条件当新问题
6. 按风险读取通用 reference：跨层边界触发时读 `.cyralis/reference/shared.md`；新增复用点或重复逻辑触发时读 `.cyralis/reference/shared.md`

---

## 修复前 gate

动手前对照 `.cyralis/reference/issue.md` 逐项确认：

- [ ] 有 failing test、可重复命令、可执行复现步骤，或写清为什么只能人工验证
- [ ] root cause 和 canonical owner 已明确
- [ ] Patch-Shape / Minimality / Pre-Edit Complexity 已按风险触发
- [ ] 选定方案的 Fix Boundary 和 non-edits 已明确
- [ ] 如果真正 canonical owner 超出 analysis 或 quick-lane 摘要声明范围，标准路径先回 `cs-issue-analyze` 更新分析，快速通道先停下让用户确认改走标准路径或扩大 quick-lane boundary；不在 fix 阶段偷偷扩范围

---

## 实现期间的约束

### 只改已声明 Fix Boundary 里的文件

标准路径修复范围来自 analysis 第 5 节"推荐方案"的"影响面"；快速通道修复范围来自用户确认过的 quick-lane Fix Boundary。超出范围的文件——哪怕顺眼——**不动**。

如果修复中发现 analysis / quick-lane 摘要选错了 canonical owner，或必须修改未声明文件才能在正确 owner 上修根因，停下来更新 analysis 或让用户重新确认方案。不要用"只是多改一个文件"绕过 fix boundary。

发现范围外值得改的记一条"顺手发现"不改代码：

```markdown
> 顺手发现：{文件:行号} {问题简述}。不在本次修复范围，可后续另开 issue。
```

为什么这么严：顺手改的代码不在分析里，验收对不上，git blame 分不清哪些改动是为这个 bug。

### 改动最小化

修复只针对根因，**不引入新抽象、新接口、新模式**。如果发现"要把这个改好得先重构 X"——停下来跟用户确认是否在这个 issue 里做重构，还是拆成独立工作。

为什么：bug 修复天然窄场景，引入新抽象意味着只有这一个使用点支撑——典型过早抽象。

### 跨层与复用守护

如果 bug 来自 contract drift、raw payload 重复解析、caller 侧补丁、duplicate owner、template / runtime parser 漂移，按 `.cyralis/reference/shared.md` 写短 `Cross-Layer Check`；如果修复需要新增 helper / decoder / projection / constant，或相同修法要改多处，写短 `Code Reuse Check`。结论是 `stop` 时回 analysis，不在 fix 阶段硬冲。

### 代码质量反射检查

修 bug 看似动作小但 AI 写修复代码一样会漂——大文件再塞特殊处理、大类再加方法、为绕开边界加 `if` 分支。反射检查见 `.cyralis/reference/shared.md`。

issue-fix 比 feature-implement 更谨慎：**触发反射信号但结论是"该拆"时默认不在本次 PR 做**——按"改动最小化"记成顺手发现。唯一例外是"不拆就没法干净修这个 bug"，那停下来跟用户确认"修这个 bug 的前置是 {重构动作}，合进来还是拆出去单独做"。

### 每完成一处改动必须汇报

修复汇报模板见同目录 `reference.md`，**不允许含糊汇报**。汇报后停下等用户回复。

---

## 验证清单

修复改完后逐项核对：

- [ ] **复现步骤验证**——按 report 第 2 节走一遍，问题不再出现
- [ ] **期望行为验证**——report 第 3 节"期望行为"现在确实发生
- [ ] **影响面回归**——analysis 第 4 节"潜在受害模块"每个走一遍最基本的冒烟路径
- [ ] **前端改动浏览器验证**（如涉及）——按项目启动约定执行，不能只 typecheck
- [ ] **相关测试通过**——有测试覆盖到修复区域就跑一遍
- [ ] **Debugging Closure**——按 `.cyralis/reference/issue.md` 写 reproduction before / verification after / canonical owner / H-class signals / confidence
- [ ] **Repair / Retirement 双轨**——涉及旧 owner / fallback / adapter / historical patch 时，说明删除或保留理由与 retirement trigger

---

## 修复未生效时：日志调试升级

走完验证清单仍**问题复现**或行为与期望不符——**别在原有猜测上反复试错**，切换到日志调试模式重新收集运行时证据。

为什么切换：反复试错本质是猜测在原假设下还有什么可能性，但如果原假设就错了再猜也是绕圈。日志强制看实际运行时数据，往往一眼看出原假设哪里偏了。

如果修复后仍有任何残留症状，按 `.cyralis/reference/issue.md` 重新做一次差异诊断：残留症状和已修症状是同一根因未修透、修错深度、复合根因，还是完全独立根因。连续 3 次修复尝试失败时停止继续补丁，回到分析阶段讨论架构 / contract / spec gap。

日志调试步骤、用户取日志提示词、循环限制见同目录 `reference.md`。

---

## 写 {slug}-fix-note.md

验证通过后在 issue 目录建 `{slug}-fix-note.md`（位置见 `cs-issue` 的"文件放哪儿"），记录完整闭环。fix-note 必须包含 Debugging Closure、Repair Track / Retirement Track、confidence。标准路径模板和快速通道模板都在同目录 `reference.md`。

---

## 独立代码评审 gate

这是对**本次 bug fix diff** 的独立 review，不替代 Debugging Closure、Repair / Retirement Track、fix-note 落档。共享口径看 `.cyralis/reference/shared.md`。

### 什么时候必须跑

命中任一条就跑：

- bug 本身属于复杂修复，不是单点小补丁
- confidence 只有 `B`，或虽然通过验证但证据链仍有空洞
- 修复涉及 canonical owner、fallback、adapter、historical patch、duplicate owner、retirement trigger
- 修复触碰了 analysis 原声明范围外的文件，或中途更新过 fix boundary
- 影响面回归涉及多个下游路径，且测试 / 手工验证只能覆盖其中一部分

### review 前要给出的材料

- report + analysis（快速通道至少给根因陈述和修复方案）
- 本次修复 diff
- 复现 before / 验证 after / 影响面回归证据
- canonical owner、compatibility boundary、retirement notes

### findings 怎么处理

- **Critical / Important**：先修，再重跑受影响的验证清单和 Debugging Closure
- **Minor**：可写进 fix-note 的遗留 / follow-up

review 结论只是 advisory；fix-note、confidence、Repair / Retirement Track 仍由本技能负责闭环。

---

## 退出条件

- [ ] 所有改动文件已提交或列清单
- [ ] 修复前 gate 已完成
- [ ] 验证清单全部勾选
- [ ] 命中独立代码评审 gate 时已完成评审，Critical / Important 已处理完
- [ ] Debugging Closure 已写，confidence 至少 `B`；若只有 `C`，已标为 mitigation / partial
- [ ] Repair Track / Retirement Track 已写（不涉及则明确写"无旧路径 / 无 fallback"）
- [ ] `{slug}-fix-note.md` 已建并填写完整
- [ ] 验证结果二选一完成：通过时写 `work.json.artifacts.fix.result="passed"` 并 `transition <issue-dir> done`；标准路径失败需回分析时写 `work.json.artifacts.fix.result="failed"` 并 `transition <issue-dir> implement`；快速通道失败则停下让用户确认是否改走标准路径，不在旧假设上继续补丁
- [ ] 没有未处理的"顺手发现"（都进后续 issue 列表）
- [ ] 没有范围外改动（或已和用户确认）
- [ ] 用户明确确认修复完成

---

## 收尾提交

按 `.cyralis/reference/shared.md` 的 scoped-commit 规则执行。本阶段：

- **提交范围**：修复代码 + `{slug}-fix-note.md` + 本次一并更新的 report / analysis
- 修复闭环后告诉用户"修复验证已完成，`{slug}-fix-note.md` 已落盘"，紧接着问是否需要 commit

---

## 退出后

告诉用户："issue 修复完成，工作流闭环。标准路径 report + analysis + fix-note 已存档；快速通道 fix-note 已存档。"

按 `.cyralis/reference/shared.md` 的 issue-fix 收尾推荐顺序各问一句（用户"不用"立即跳过）：

1. 暴露了值得复用的坑点 → "沉淀 learning？（`cs-learn`）"
2. 沉淀出长期约束 / 规约 / 技术决定 → "归档决定？（`cs-decide`）"
3. 这个 bug 暴露了项目通用的硬约束 / 命令陷阱 / 环境设置（一两行能讲清、cyralis 技能每次启动都该知道）→ "记到启动 notes？（`cs-note`）"
4. 最后问是否代为提交。同意时按收尾提交规则执行

建议：把 issue 目录文件和代码改动放同一次提交方便追溯；"顺手发现"另开 `cs-issue-report` 处理别塞这个 PR。

修复中发现问题实际是功能缺失（不是 bug）→ 建议另开 `cs-feat`，别在 issue 工作流里偷偷做新功能。

---

## 容易踩的坑

- 修完没走验证清单就宣告"修好了"
- 顺手改了 analysis 范围外的代码
- 修复引入新抽象 / 接口但没停下来确认
- `{slug}-fix-note.md` 没建就宣告完成
- 发现影响面回归有问题但写"轻微影响可忽略"——要修到干净
- 前端改动只 typecheck 就报通过
- 用户没明确说"修复完成"就结束
- 涉及 fallback / owner / retirement 风险却没跑独立代码评审
- 修复未生效继续原假设上反复猜测试错，不切换到日志调试
- 日志调试结束后没清理临时 log 就提交
- 收尾时没问用户是否代为 commit
- 用户没明确同意就 `git commit`
