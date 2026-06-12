---
name: cs-feat-design
description: feature 流程阶段 1——为新功能起草 {slug}-design.md 作为后续实现和验收的唯一输入，拍板后抽出 checklist。触发：用户说"开始设计方案"、"写 design doc"、"准备实现 XX"，前提是已知道做什么、为谁、怎么算成功。
---

# cs-feat-design

## 启动必读

这一阶段的产出是一份方案文件 `{slug}-design.md`，加上从中抽出的行动清单 `{slug}-checklist.yaml`。这两份东西后面会被两个阶段消费——implement 照着推进、acceptance 照着核对，所以这里写错或写漏，下游就跟着错。

> 共享路径和命名约定看 `.cyralis/reference/shared-conventions.md`。本阶段一般 feature 目录已经由 brainstorm 创建好了；没有的话在这一步建。

本阶段有三个入口：

- **正式起草**：用户已经能讲清楚需求（或已经填好 `{slug}-intent.md`），直接进"流程"一节走完整起草。
- **初始化模式**：用户说"开一个新需求 / 起个草稿 / 新建一个 feature"，但想自己先写半成品方案而不是口述。走下一节"初始化模式"，建好目录和空 `{slug}-intent.md` 就结束本轮，等用户填完再回来。
- **从 roadmap 条目起头**：用户说"开始做 roadmap 里的 {子 feature slug}"或"推进 {roadmap} 的下一条"。slug 从 roadmap items.yaml 取，不另起；动笔前要读 roadmap 主文档和 items.yaml 了解上下文和依赖状态；落盘时 frontmatter 要带 `roadmap` / `roadmap_item` 两个字段，同时回写 items.yaml 把对应条目 `status` 改为 `in-progress`、`feature` 填为 feature 目录名，并在 feature 目录写入 `work.json`。详见下文"从 roadmap 条目起头"。

---

## 初始化模式：帮用户建目录和 intent 草稿

触发：用户想自己写一份半成品方案（`{slug}-intent.md`）作为后续 design 的输入，但不想手动建目录。

动作：

1. **和用户快速对齐两件事**——一句话需求概要 + 敲定 slug（小写字母、数字、连字符；`user-auth`、`export-csv` 这种）。日期取当天（frontmatter 用 `currentDate` 即可）。feature 目录命名是 `YYYY-MM-DD-{slug}`。
2. **创建 `.cyralis/features/{YYYY-MM-DD}-{slug}/` 目录**。
3. **写入 `work.json`**：`mode: "feature"`，`status: "design"`，`artifacts.intent.path` 指向 `{slug}-intent.md`，`artifacts.design.approval` 写 `draft`，然后执行 `python .cyralis/tools/work.py activate .cyralis/features/{YYYY-MM-DD}-{slug}` 设为当前 session 的 active work。
4. **写一份空的 `{slug}-intent.md`** 作为草稿骨架，内容就是下面这段：

   ```markdown
   ---
   doc_type: feature-intent
   feature: {YYYY-MM-DD}-{slug}
   summary: {一句话需求，AI 按和用户对齐的结果填}
   ---

   # {slug} intent

   ## 背景 / 为什么做

   （一句话就够）

   ## 大致怎么做

   （100 字左右描述想法，含关键步骤 / 数据流）

   ## 相关数据结构 / 类型

   （贴相关 types、接口签名、或指向代码位置）

   ## 已知不做 / 待定

   （可选：明确的边界或自己也没想清楚的地方）
   ```

5. **告知用户"骨架已建好，填完后再来找我，我基于 intent 写正式 design"**，然后**本轮结束，不继续推进 design 流程**。

为什么在这里停？intent 的价值就是让用户离线思考、把脑子里的东西落到纸面。AI 继续问会把 intent 模式退化成 brainstorm，失去意义。

---

## 从 roadmap 条目起头

触发：用户说"开始做 roadmap 里的 {子 feature}"或指向 items.yaml 里某条 `planned` 条目。

1. **读 roadmap 上下文**——打开 `{roadmap-slug}-roadmap.md` 和 `{roadmap-slug}-items.yaml`：
   - 目标条目必须 `status: planned` + `depends_on` 前置全 `done`，否则停下来报告
   - **必读主文档第 3 节"模块拆分"和第 4 节"接口契约 / 共享协议"**——这是本 feature 的硬约束输入。契约不合理 / 漏了 → 停下来建议回 `cs-roadmap update` 改，**不要在 design 里偷偷绕开**
2. **slug 从 roadmap 取**，feature 目录 `YYYY-MM-DD-{roadmap 条目 slug}`，不另起
3. **走"流程"一节**，frontmatter 加 `roadmap` / `roadmap_item` 两字段
4. **用户确认方案后写 `work.json.artifacts.design.approval: approved`，生成 checklist 后执行 `python .cyralis/tools/work.py transition .cyralis/features/{YYYY-MM-DD}-{slug} implement`，同时回写 items.yaml**：对应条目 `status: in-progress` + `feature: YYYY-MM-DD-{slug}`，用 `validate-yaml.py` 校验

完整衔接协议看 `.cyralis/reference/shared-conventions.md` 第 2.5 节。

---

## design 写什么、不写什么

design 只管"编排-计算分离"里的编排那一侧：**这次 feature 在名词层和编排层的现状与变化**。计算层细节（具体怎么写、改哪些函数、测试怎么搭）归 implement。

写三类东西，名词层和编排层都用"**现状 → 变化**"两段式：

1. **名词层**——值对象 / 实体 / 数据结构 / 对外契约 / 类型定义
2. **编排层**——主流程 / workflow / 关键编排函数 / 控制流拓扑（线性 / 分支 / 并行 DAG / 状态机）。开头一张主流程图建 mental model
3. **流程级约束**——错误语义、幂等性、并发 / 顺序、扩展点位置、可观测点。挂载点清单也归这类

外加一个**固定结构健康度环节**（第 2.5 节）：评估即将被改动的文件是否偏胖 / 职责混杂、以及新文件要落进的目录是否摊平，决定是否在实现前先做"只搬不改行为"的微重构（拆文件 / 重组目录）。即使结论是"不做"也要在 design 里显式写出来——否则 AI 默认会持续往胖文件里塞代码、往拥挤目录里加文件。这一节随整稿一起进整体 review，不单独走确认。

**判据**：换一种写法名词层或编排层会变得不同 → design 的事；换一种写法只是"代码不那么好看 / 函数拆法不同 / 测试用了别的 framework" → implement 的事。

不写改动文件清单、函数级落点、测试代码、库选型细节——design 阶段还没读完相关代码，预测多半会回头改。implement 拿到 design 后才扫现状决定。

---

## 方案文件是给人概览的，不是给人仔细阅读的

读者打开 `{slug}-design.md` 是想 5 分钟内抓到要点，不是逐字精读。具体做法：

1. **每节超过 1 屏就砍或拆**——一屏装不下读者会失去定位
2. **术语先锁死**——动笔前 grep 代码 / 架构 / 历史 feature 防冲突，事后理顺成本远高于预防
3. **示例优先于定义**——接口行为先给"输入→输出"示例，复杂时再补正式类型
4. **同一条信息只在最自然的位置出现一次**——重复表述比缺一条还烦
5. **新逻辑默认放新文件**（写在改动计划里）——文件越大越难分清职责

---

## 起草时的三条纪律

### 1. 别替用户做决定

碰到"用户没说清的角落"默认停下来问，不自己挑一个填上去。具体：

- **声明假设**：非用户原话的判断写成"假设：……"，让用户能精确反驳
- **给选项不自选**：2-3 种合理做法都摆出来再讲倾向
- **看不懂就停**：硬猜着写下去到了 acceptance 阶段对不上验收点

### 2. 目标和约束都写成可验证的

- 不写"让它能跑"、"用户体验顺畅"这种弱标准——改写成"输入 A 时返回 B"
- "明确不做"具体到能被 grep 或测试反向核对，不写"不过度设计"这种空话

### 3. 每个 feature 都要能被卸载

回答："如果想把它拔掉，要拔哪些地方？" 答不出说明边界没想清楚，feature 一上线就变成拆不动的既成事实。

落到挂载点清单（第 2.3 节）。**判据**：删掉这一项，feature 在用户/系统视角是不是就消失了？是→列，否→不列。详细 ✅/❌ 例子和写法看 .cyralis/reference/feature-workflow.md。这清单顺带帮你发现自己有没有不小心往太多地方插桩——真挂入点越多代表耦合越散，是个信号。

---

## 流程：什么时候做什么

### 1. 启动检查

**前置 gate**：需求输入至少含 用户目标 / 核心行为 / 成功标准 / 明确不做 四项（来源 intent / brainstorm / 对话）。缺了补；用户自己说不清就回退到 brainstorm。

**必做 4 条**：

1. **续作检查**——Glob `{slug}-design.md` / `{slug}-intent.md` / `{slug}-brainstorm.md`，并读取同目录 `work.json`：
   - intent / brainstorm：当作输入读入，不重复问已讲清的部分
   - `work.json.artifacts.design.approval=draft` 且 design 各节基本完整 → 跳到本流程"5. 整体 review"
   - design 部分节缺失 → 补缺失节，汇报"上次写到 X，补齐统一给你 review"
   - `work.json.artifacts.design.approval=approved` → 别默认覆盖，问用户接着改还是另起 slug
2. **扫 .cyralis/ 全局输入**——Glob `.cyralis/` 发现可用目录和文档类型，按类取用：
   - `architecture/` → 读 ARCHITECTURE.md + 索引 + 相关子系统 doc，关注名词复用和流程级约束
   - `requirements/` → 有对应 req：frontmatter `requirement` 填 slug，读"用户故事 / 边界"两节；新能力首次出现 → 触发 `cs-req draft` 起草愿景 req，frontmatter `requirement` 填新 slug；纯重构 / 技术债留空
   - `compound/` → 用 `search-yaml.py --dir .cyralis/compound` 搜相关 decision / explore / trick / learning；命中冲突 decision 必须正面回应
   - `features/` → 搜历史 design 有无同类 feature 可参考
   - 其余目录按内容类型自行判断
3. **读需求相关的现有代码**——读哪些文件由需求线索决定
4. **输入基线对齐**——读完 req / architecture / roadmap / compound / 历史 feature 后，动笔前判断这次 design 的输入是否一致：
   - Requirement 基线：用户目标、边界、明确不做是否和已有 req / brainstorm / intent 对齐
   - Architecture / runtime 边界：目标 owner、对外契约、依赖方向是否和架构文档对齐
   - Roadmap / compound 约束：roadmap 子 feature 的共享协议、compound decision / learning 是否约束当前方案
   - 结果只允许：`aligned` / `requirement-defect` / `architecture-defect` / `implementation-drift` / `missing-authority` / `needs-clarification`
   - 非 `aligned` 时先处理：缺权威就补 req / architecture / roadmap；基线本身错就建议先修基线；实现漂移则在 design 里正面写出并约束回归。不要在错误基线上继续写方案

**按信号触发**（没信号跳过）：

- **术语 grep 防冲突**——新概念名没在代码 / 架构 / 历史 feature 里见过时，grep 一遍；冲突就换名或在第 0 节明确区分
- **复杂度档位对齐**——需求里出现"对外 SDK / 高并发 / 一次性工具"等偏离信号时，打开 `.cyralis/reference/code-dimensions.md` 列偏离点；无信号写"走默认档位"
- **跨层边界检查**——feature 触及 2+ 层、payload / event / config / API contract / generated template / runtime parser 时，读取 `.cyralis/reference/cross-layer-thinking.md`，在第 1 节或第 2.2 节写短 `Cross-Layer Check`
- **复用与单一 owner 检查**——feature 要新增 helper / utility / shared component / adapter / decoder / normalizer / projection / constant / config key，或同类逻辑已有 2 处以上时，读取 `.cyralis/reference/code-reuse-thinking.md`，在第 2.1 / 2.5 节写短 `Code Reuse Check`
- **grep 找"叫法不同的类似模块"**——直觉"可能已有人做过但命名不同"时，grep 同义词

详细规则看 `.cyralis/reference/shared-conventions.md` 第 5 节。

### 2. 想清楚这功能该放在哪儿

动笔写名词层 / 编排层前，先回答：**这次要加的东西在项目整体结构里属于哪儿？**

- 现有模块本该承担？→ 在那个模块里扩展，别另起
- 横跨多个模块？→ 抽公共层 vs 让某一方主导、其他方依赖
- 跟现有任何模块都不像？→ 新建独立模块/子系统，对外暴露什么、跟别人怎么交互提前想清楚
- 可能已有模块在做类似的事但叫法不同？→ grep 几个同义词

代价：放错了模块就变"什么都装的筐"；新建平行实现就有几个版本同存。

结论写进第 1 节"决策与约束"。涉及新建模块或跨模块接口时同步写进第 4 节，提示在 `ARCHITECTURE.md` 加指向。

AI 默认翻车的姿势是**不思考就往眼前最顺手的文件里加**。

**架构完整性检查（按信号触发）**：出现新 owner / 新 contract / 跨模块接口 / adapter / fallback / compatibility path / 责任重叠 / 可能存在更高层承接点时，在第 1 节写一个短检查，不要另起重型流程：

```markdown
#### 架构完整性检查
- 不变量：{本 feature 不能破坏什么}
- canonical owner / contract：{谁负责，边界是什么}
- 责任重叠：{是否和现有模块 / 旧路径重叠}
- 该丢的假设：{哪些是历史形状 / 未证偏好 / 旧实现惯性}
- 更高层承接点：{有没有更合适的上层 API / 协议 / roadmap 契约}
- 旧路径 / fallback 退休条件：{没有就写"无"}
- 证伪点：{发现什么证据就要改方案 / 回 roadmap / 回 arch}
- 结论：{按当前设计推进 / 调整 owner / 回 roadmap 修契约 / 另走 refactor}
```

### 3. 写"现状 → 变化"两段式的名词层和编排层

按 `.cyralis/reference/feature-workflow.md` 模板写第 2 节四个子节（2.1 名词层 / 2.2 编排层 / 2.3 挂载点 / 2.4 推进策略）。重点提示：

- "现状"必须指向代码位置，不能想当然——读者要靠它判断"变化"是否合理
- **产品风险检查（按信号触发）**——涉及用户可见行为 / UI workflow / 产品策略 / 多方案价值取舍 / 成功标准仍带判断时，在第 1 节写 `Value / Non-goals / Trade-offs / Decision needed` 四行；纯内部能力或技术性 feature 不写，避免重复需求摘要
- 编排层开头一张 mermaid 图建 mental model
- 挂载点按"删了它 feature 是否消失"判据，3-5 条为正常区间
- 推进策略按 paradigm 维度切片（编排骨架 → 计算节点 → 持久化 → 测试），不下沉到 file:line
- **第 2.5 节"结构健康度与微重构"是固定步骤**——按 .cyralis/reference/feature-workflow.md 写作要求评估**两类对象**：要改的文件（文件级）+ 要落新文件的目标目录（目录级）。**评估前先查 compound 已有 convention**（关键词围绕"目录组织 / 文件归属 / 命名约定"），命中就直接照办。结论三选一：
  1. **不做**——文件健康 / 目录不挤 / 改动量小 / 微重构收益不抵风险，写"本次不做微重构，原因：……"
  2. **做微重构（拆文件）**——文件偏胖或职责混杂但能用 provable refactor（拆函数 / 拆文件 / 移动定义，编译器全程绿灯）解决
  3. **做微重构（重组目录）**——目标目录摊平且能通过纯文件移动 + import 路径更新解决（编译器全程绿灯）

  选择 2 / 3 时给出"搬什么 → 搬到哪 → 怎么验证行为不变"的具体方案，落进 checklist 作为**第 1 步且独立验证退出**，再开始 feature 主体
  决策卫生里的复杂度信号并入这里：owner mismatch、router / manager / handler 继续变胖、shared util 被塞新责任、fallback / adapter 增长、深层嵌套或大块逻辑、文件职责混杂。
- **重组目录时多问一步：是稳定模式还是一次性整理**——稳定模式（如"自定义业务组件统一放 `components/custom/`"，未来其他 feature 也该遵守）就在 2.5 末尾加"建议沉淀的 convention"段，提示用户 implement 跑通后走 `cs-decide` 归档；一次性整理（只是这个目录碰巧挤了）就只搬不归档。**design 阶段不直接归档**——方案还没真跑过，留钩子给 implement 后再决定
- **design 只做安全的微重构，边界严格守住**："只搬不改行为"——文件级靠 IDE rename / move + 编译器校验，目录级靠纯文件移动 + import 路径更新 + 编译器校验。一旦涉及改函数签名 / 改返回值结构 / 改调用关系语义 / 模块拆合，就**超出 design 范围**：写进第 2.5 节末尾的"超出范围的观察"里提示用户"建议后续走 `cs-refactor` 处理"，**不阻塞本 feature、不作为前置依赖**。是否真去做、什么时候做由用户在 feature 之外决定
- **第 2.5 节随整稿一起 review，不单独确认**——和功能方案打包给用户一次过，避免拆成两轮把节奏拖长

### 4. 补齐剩下各节，整稿一次性给 self-review

按 .cyralis/reference/feature-workflow.md 模板补齐剩余节（第 0 / 3 / 4 节）。初稿落盘后写 `work.json.status="design"`，并写 `work.json.artifacts.design.approval="draft"`。

整稿成型后先做 design self-review，通过后才交给用户看。**不分批 review**——分批用户只看到局部，发现不了"第 1 节范围跟第 2 节变化对不上"这种跨节问题。

第 3 节"验收契约"提示：每条写成"输入 / 触发 → 期望可观察结果"，覆盖正常 + 边界 + 错误。不写测试代码 / framework / mock。

### 4.5 Design self-review pass

整稿写完、交给用户 review 前，必须切到 reviewer 姿态自审一次。自审时**忽略未落到文档里的聊天记忆**：如果某个决定只存在于对话里，不存在于 design / requirement / roadmap / architecture / compound / code source 中，就按 design 缺失处理。

只报告会导致 implement 做错、验收对不上、roadmap 漂移、接口不一致、边界失守的问题；不要报告措辞风格、格式洁癖、可有可无的补充说明。

按 7 类检查：

1. **Source Trace**——requirement / intent / brainstorm / roadmap / architecture / compound 的硬约束是否都在 design 中有落点；roadmap 起头时，第 3 节"模块拆分"和第 4 节"接口契约 / 共享协议"是否逐项落实
2. **Section Completeness**——frontmatter、0/1/2/3/4 节、输入基线对齐、触发式产品风险 / 架构完整性检查、2.5 结构健康度是否齐全
3. **Contract Consistency**——同一接口 / 字段 / 类型 / 状态名在第 1 / 2.1 / 2.2 / 3 节叫法一致；示例输入输出和名词层定义一致；编排层不引用名词层不存在的字段或状态
4. **Roadmap / Architecture Alignment**——roadmap_item 的目标、依赖、共享协议没有被改写；owner / contract / dependency direction 和 architecture 对齐；要改 roadmap 契约就回 roadmap，不在 feature design 偷改
5. **Boundary Closure**——明确不做没有在第 2 节被隐含实现；每条 non-goal 在第 3 节有反向核对项；open question 没被伪装成已确认决策
6. **Verification Readiness**——每个成功标准都有可观察验收场景；错误 / 边界路径有可验证结果；第 2.4 每步有独立 exit_signal
7. **Structure Health**——第 2.5 没漏掉明显 owner mismatch / fallback 增长 / shared util 膨胀 / 大文件继续加职责；微重构只包含"只搬不改行为"

输出格式固定：

```markdown
## Design Self-Review

**Status:** Approved | Issues Found

**Blocking Issues:**
- [Section / Source]: {问题}
  - Why it matters: {为什么会导致实现 / 验收 / roadmap 出问题}
  - Required fix: {必须怎么改}
  - Also update: {受影响的其他节}

**Advisory Notes:**
- {不阻塞实现，但值得用户知道的取舍或后续事项}
```

有 Blocking Issues：先修 design，再重新跑 self-review。最多连续自修两轮；两轮后仍有 blocking issue，停下来向用户报告，不继续生成 checklist。Approved 后才进入整体 review。

高风险设计（roadmap 起头、跨模块接口 / schema / public API / persistence / permission / fallback / compatibility，或 self-review 连续发现问题）可以用同目录 `design-document-reviewer-prompt.md` 新开 session / subagent 做 fresh review；这不是默认必做。

### 5. 整体 review

Design self-review Approved 后，发一次整体 review 提示（提示词在 `.cyralis/reference/feature-workflow.md` 第 5 节）。用户提意见就改；如果修改触及 roadmap 对齐、接口 / 字段 / 状态、边界、验收契约、2.5 微重构结论，必须针对受影响部分重跑 self-review（改动很大就全量重跑）。反复直到放行，把 `work.json.artifacts.design.approval` 从 `draft` 改 `approved`；checklist 生成后用 `python .cyralis/tools/work.py transition <feature-dir> implement` 进入 implement，不手写 `work.json.status`。

### 6. 生成 {slug}-checklist.yaml

方案确认后，**先做 Checklist 压力检查**，确认 design 已经足够支撑 checklist，再从 `{slug}-design.md` 抽出 `steps` + `checks` 落到 `{slug}-checklist.yaml`。完整格式、提取规则、典型节奏看 .cyralis/reference/feature-workflow.md 第 3 节。

压力检查只回答 checklist readiness，不重新做设计：

```markdown
#### Checklist 压力检查
- Owner / contract 是否足够清楚：{是 / 否，缺什么}
- 验证边界是否清楚：{每个关键场景是否能落成 check}
- steps 是否能独立退出：{2.4 的每步有没有 exit_signal}
- 是否需要先回 design 补充：{否 / 补第 X 节}
- 结论：{生成 checklist / 修 design / 回 brainstorm / 回 roadmap}
```

结论不是"生成 checklist"时，先补 design 并让用户确认修改点；不要硬抽一份含糊 checklist。

落盘后 `python .cyralis/tools/validate-yaml.py --file {path} --yaml-only` 校验。

### 7. 退出

按下文退出条件核对，引导用户进入阶段 2。

---

## 退出条件

用户整体 review 通过，并且：

- [ ] frontmatter 完整（`doc_type` / `feature` / `summary` / `tags`），requirement 字段已对齐；`work.json.artifacts.design.approval=approved`
- [ ] Design self-review 已通过；Blocking Issues 已修完，若连续两轮仍未通过已停止并向用户报告
- [ ] 启动检查已完成输入基线对齐；非 `aligned` 的结果已先处理或写明下一步
- [ ] 第 1 节含"不做什么"和复杂度档位偏离（或明确走默认）；触发时包含产品风险检查 / 架构完整性检查
- [ ] 第 2.1 / 2.2 用"现状 → 变化"两段式；接口有示例 + 来源位置；编排层开头有主流程图
- [ ] 第 2.3 挂载点按"删了它 feature 是否消失"判据收紧（一般 3-5 条）
- [ ] 第 2.4 推进策略按 paradigm 维度切片，每步有退出信号
- [ ] 第 2.5 结构健康度评估覆盖文件级 + 目录级；评估前已查 compound convention；结论显式写出（不做 / 拆文件 / 重组目录）；选"微重构"时 checklist 第 1 步是它且有独立退出信号；选"重组目录"且属稳定模式时含"建议沉淀的 convention"段；超出"只搬不改行为"的结构性问题列在"超出范围的观察"，仅提示不阻塞
- [ ] 第 3 节关键场景覆盖正常 + 边界 + 错误；含"明确不做"反向核对项
- [ ] 生成 checklist 前已做 Checklist 压力检查，结论为"生成 checklist"；`{slug}-checklist.yaml` 已落盘并通过 `validate-yaml.py` 校验
- [ ] roadmap 起头时 items.yaml 已回写（`status: in-progress` + `feature` 填上）

---

## 容易踩的坑

- 没读相关架构 / 术语没 grep 就动笔——方案跟现有代码对不上、术语冲突后 git blame 找十倍时间
- 用散文描述接口行为，没给具体示例——读者建不起模型
- 名词层 / 编排层只写"变化"不写"现状"——读者无法判断变化是否合理
- 把挂载点清单写成改动文件清单——内部改动归 implement，挂载点只列"删了它 feature 就消失"的登记条目
- 在 design 写测试代码 / framework / mock / 函数级落点——这些归 implement 自决
- 强行画图——模块 ≤ 2 个、调用线性时画图反而模糊重点
- 只给半份文档先 review——用户看不出全局一致性
- 整稿写完不跑 self-review 就交给用户——把 roadmap 对齐、字段一致性、边界闭环这些机器能先抓的问题推给用户
- 在需求摘要里偷偷扩范围——验收时对不上
