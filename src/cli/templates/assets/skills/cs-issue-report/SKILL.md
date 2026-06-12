---
name: cs-issue-report
description: issue 标准流程阶段 1——通过对话把问题落成可复现、可追溯的 {slug}-report.md。启动检查可把低风险问题改走快速通道，但快速通道不产出 report。只问现象不猜根因。触发：用户说"提个 issue"、"记录这个 bug"、"我发现一个问题"。issue 标准工作流的起点。
---

# cs-issue-report

## 启动必读

涉及快速通道判断时，同时读取 `.cyralis/reference/debugging-governance.md` 第 3 节。快速通道不是"感觉简单就直接改"，而是低风险、单 owner、证据明确的 compact debugging lane。

这一阶段的标准职责是把用户脑子里的问题落成结构化记录。启动检查如果发现完全满足快速通道准入，则转为 quick-lane fix：不写 `{slug}-report.md`，只创建 / 激活快速通道 `work.json` 并交给 `cs-issue-fix`。

**核心原则：只记现象不记根因**。用户说"我觉得是 XX 组件的问题"——记下"用户怀疑 XX 组件"作为线索，但不顺着聊根因。根因要在阶段 2 通过实际读代码确认，不靠脑子里猜。混进根因猜测的报告会带偏阶段 2，让分析人围着错误线索绕。

> 共享路径与命名约定看 `.cyralis/reference/shared-conventions.md` 第 0 节和 `cs-issue` 的"文件放哪儿"。

---

## 启动检查

1. **确认是 bug 不是新功能需求**——描述"想加 X 功能"的告诉他走 `cs-feat`
2. **看有没有相关 issue 目录**——Glob `.cyralis/issues/`，有同类问题先和用户确认是新建还是更新
3. **快速通道判断（唯一正式判定点）**——按用户线索**读一下相关代码**（Grep / Read 定位），再对照 `debugging-governance.md` 第 3 节：
   - **能一眼确定根因且满足 quick lane 全部准入**（有复现信号、单一 canonical owner、能给出 `{文件}:{行号}`、修复改动小 1-2 处、无跨模块 / contract / fallback / adapter / duplicate owner 风险）→ 告诉用户"我已看到问题所在，可以走快速通道：直接告知根因、修复方案和 Fix Boundary，你确认后我立刻修，修完你验证，只写一份 `{slug}-fix-note.md`"。同意后创建 / 激活 `status: "implement"`、`artifacts.fix.quick_lane=true` 的 issue work item，并触发 `cs-issue-fix`（快速通道模式）
   - **不能**（根因有多个候选 / 不确定 / 需要更多复现信息 / 命中 Patch-Shape 或 H-class 风险 / 涉及 shared、core、contract、fallback、adapter、duplicate owner、consumer-side patch）→ 走标准路径做完整问题报告。进入标准路径后默认不再二次改判
4. **确定 issue 目录名**——跟用户商定 slug，日期前缀用今天（环境信息 `currentDate`）。目录不存在就创建。快速通道也要建 issue 目录，`{slug}-fix-note.md` 放那
5. **写入 / 激活 `work.json`**——标准路径目录新建时按 `.cyralis/templates/issue/work.json` 写 `mode: "issue"`、`status: "design"`、report / analysis / fix 路径，然后执行 `python .cyralis/tools/work.py activate .cyralis/issues/{YYYY-MM-DD}-{slug}`。快速通道目录新建时也从同模板起步，但把 `status` 设为 `"implement"`、`artifacts.fix.quick_lane=true`、`artifacts.report.confirmed=false`、`artifacts.analysis.confirmed=false`，然后 activate；已有目录则读取现有 `work.json`，不要覆盖。

---

## 必答 5 问

按顺序逐个问，**不一次抛 5 个**——一次抛多个用户只回最容易的，深的就漏了。每问做一次模糊度检查，不通过继续追问。

### 1. 问题是什么？看到的现象？

期待具体的异常表现："点击提交按钮后弹出了空白弹窗" 比 "提交功能有问题" 有用一百倍。

模糊信号："有时候会出错"、"感觉不对" → 追问"具体什么时候"、"具体什么不对"。

红线：**不要让用户描述根因**。出现"应该是因为 XXX"——记现象，根因留给阶段 2。

### 2. 怎么复现？

期待最小复现步骤：进入 XX 页面 → 输入 YY → 点击 ZZ → 看到问题现象。

模糊信号："不稳定复现"、"有时候能有时候不能" → 追问复现频率和条件差异。确实不稳定就写明已知触发条件和复现率。

"无法复现"也是有效回答——写"目前无法稳定复现，只在 X 情况下观察到一次"，别勉强凑步骤。

### 3. 期望行为 vs 实际行为

期待两句话：
- **期望**：我以为做了 A 之后应该发生 B
- **实际**：但实际发生了 C

**不要合并成一句**。合在一句"按钮没正常工作"里分析的人不知道"正常"长什么样。

### 4. 环境信息

最低采集：**在哪个模块 / 功能区域发现的**、**相关文件或函数（用户知道的话）**。

可选：操作系统、浏览器版本、运行环境（dev / prod）、最近有没有改过相关代码。

用户说"不知道在哪个文件"——写"待定"，阶段 2 分析时查。

### 5. 严重程度与优先级

- **P0 阻塞**：核心功能完全失效，影响所有用户，必须立刻修
- **P1 严重**：核心功能受损有绕过方法，尽快修
- **P2 中等**：非核心功能或影响少数用户，计划内修
- **P3 轻微**：UI 瑕疵 / 边界情况 / 有更好实现，按空闲修

用户不确定就帮他推荐一个但让用户拍板。

---

## 问题报告模板

```markdown
---
doc_type: issue-report
issue: {issue 目录名}
status: draft
severity: P0 | P1 | P2 | P3
summary: {问题现象一句话}
tags: []
---

# {问题简述} Issue Report

## 1. 问题现象

{用户描述的具体异常表现，纯现象描述，不含根因推测}

## 2. 复现步骤

1. {步骤 1}
2. {步骤 2}
3. 观察到：{问题现象}

复现频率：{稳定 / 概率（约 X%） / 暂无法稳定}

## 3. 期望 vs 实际

**期望行为**：{做了 A 应该发生 B}

**实际行为**：{但实际发生了 C}

## 4. 环境信息

- 涉及模块 / 功能：{模块名或功能描述}
- 相关文件 / 函数：{已知 file:line 或"待定"}
- 运行环境：{dev / staging / prod / 不确定}
- 其他上下文：{OS、浏览器、最近改动等，没有写"无"}

## 5. 严重程度

**{P0 / P1 / P2 / P3}** — {一句话理由}

## 备注

{可选：截图描述、日志片段等}
```

---

## 退出条件

- [ ] frontmatter 完整（`doc_type=issue-report` / `issue` 一致 / `severity` 和 `summary` 非空 / `tags` ≥ 1）
- [ ] 5 问都有具体答案（环境中相关文件可"待定"）
- [ ] 问题现象是纯现象描述，没混入根因推测
- [ ] 期望 vs 实际显式分开写
- [ ] 复现步骤可执行（"无法稳定复现"也有说明）
- [ ] 用户明确说"report 可以了，进下一步"
- [ ] frontmatter `status: confirmed`
- [ ] 标准路径 / 快速通道二选一完成：标准路径写 `work.json.artifacts.report.confirmed=true` 并 `transition <issue-dir> implement`；快速通道不写 report，直接创建 / 激活 `status="implement"` + `artifacts.fix.quick_lane=true` 的 work item

---

## 退出后

标准路径告诉用户："问题报告已就绪，work.json 已通过 transition 进入 implement。下一步阶段 2 根因分析，触发 `cs-issue-analyze`。"

快速通道告诉用户："快速通道已确认，work.json 已激活为 implement quick-lane。下一步直接修复验证，触发 `cs-issue-fix`。"

别自己顺手开始分析根因——阶段间的人工 checkpoint 是工作流硬约束。

---

## 容易踩的坑

- 用户说"可能是 XX 的问题"你顺着聊根因——错，那是阶段 2
- 复现步骤太模糊（"在用户界面操作一下"）就放行——逼出可执行步骤
- 期望和实际混在一段话里——必须显式分开
- 严重程度留空——给默认值或写"无"
- 一口气把 5 问列成清单丢给用户填——逐题对话否则深的全漏
