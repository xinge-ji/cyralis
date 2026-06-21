---
name: cs-docs-neat
description: Cyralis 文档与知识库收尾整理技能。用于阶段结束、里程碑完成、准备交接/提交、用户说"整理文档"、"同步记忆"、"更新 attention"、"收尾"、"这个阶段做完了"、"新人能直接上手"、"docs 过期/冲突了"、"sync up"、"tidy up docs"、"update memory"、"/sync"、"/neat"时，对 `.cyralis/attention.md`、`.cyralis/`、README、docs/、host skill 投影做项目内盘点、反膨胀、补漏和冲突修正。
---

# cs-docs-neat

## 启动必读

开始任何判断或动作前，先读取 `.cyralis/attention.md`。

你是**知识库编辑**，不是记录员。记录员只会追加；编辑要审查项目知识、合并重复、修正过期、删除废弃，把稳定知识放到正确受众层。目标是让下一位人类、下一次 agent、下游项目都不会被旧文档误导。

不要把任务降级成“补几句文档”。在 AI 协作开发中，代码可以重写，但 `.cyralis/`、项目入口和 docs 是跨会话、跨 host 的桥梁。错误上下文会让下次 agent 基于错误前提动手；混乱 docs 会让接手者浪费时间重新推断系统。

`cs-docs-neat` 不是 `cs-guide`：`cs-guide` 写单篇开发者 / 用户指南；`cs-docs-neat` 做阶段收尾的项目知识库卫生检查和项目内同步。

---

## 四层知识，四种受众

必须先理解分工，否则会只改项目入口或只改 `.cyralis/attention.md` 就结束，把 docs、`.cyralis/` 和记忆晾在一边。

| 层级 | 典型文件 | 读者 | 职责 | 不同步的代价 |
|---|---|---|---|---|
| Cyralis 工作流记忆 | `.cyralis/attention.md`、`requirements/`、`architecture/`、`roadmap/`、`compound/` | Cyralis 技能和项目维护者 | 软件生命周期事实、长期约束、架构现状、规划、沉淀 | 后续 feature / issue 读到过期事实 |
| 项目入口 | `.cyralis/attention.md`、`CLAUDE.md`、平台等价文件 | 当前仓库里的 AI agent | 每次写代码必须遵守的规则、命令、红线、文档索引 | 下次 AI 在项目里走弯路 |
| 外部读者文档 | `README.md`、`docs/` | 人类同事、下游开发者、未来接手者 | 接入、使用、集成、运维、架构解释 | 人或系统无法正确接入 / 运维 |
| Host skill 投影 | `.codex/skills/`、`.claude/skills/`、`.pi/skills/` | 当前仓库里的 host agent | Cyralis workflow 的 host 可发现入口 | skill 投影过期或缺失 |

四层都要看。`.cyralis/attention.md` 是 Cyralis 新项目的默认启动必读。不要主动读取或修改全局 agent 配置、全局 memory、OpenCode 配置等 Cyralis 项目边界外文件。

---

## 毕业机制：把稳定知识往上泵

docs 靠就地编辑收敛，项目上下文也容易追加膨胀。没有反向阀门，稳定知识会困在松散 note、旧设计、旧入口段落里，既进不了正确上下文，也没变成别人能看的文档。

**反向阀门 = 毕业（promote）。** 临时记录、旧入口段落或 `.cyralis/attention.md` 长文满足任一条件，就把内容并进对应项目文档，然后删除原记录或缩成一行指针：

- 同一主题教训反复出现到第 3 次：它已是稳定知识，不是“最近踩的坑”。
- 内容讲的是“系统怎么工作”：它属于 `.cyralis/architecture/`、README 或 docs。
- 内容是“X 上线 / 落地 / 就位”的事件记录：现役事实进 docs / architecture，过程归 git log / changelog，memory 不留常驻文件。
- 内容是项目命令 / 红线 / 环境陷阱：优先进 `.cyralis/attention.md`；如项目仍保留项目入口，再同步到 `CLAUDE.md`。

判据一句话：**下一个接手的人（不只是当前 agent）需要知道这件事吗？** 需要，就属于项目文档；不需要，才可能留在个人 memory。

本技能不主动整理全局 agent memory；如果用户把外部记忆内容贴进来，只把它当作输入材料，毕业到项目内文档后再让用户自行处理外部副本。

---

## `.cyralis/attention.md` 是启动必读，不是变更日志

最常见翻车模式：每次开发完都在 agent 入口顶部加历史叙事：“2026-05-08 X 功能上线，详见 docs/Y”。一次很爽，半年后真正规则被 200 行历史推到看不见。

判断一条信息该不该进 attention，问：**下次技能启动时如果没看到这条，会不会犯错？**

| 例子 | 进 `.cyralis/attention.md`？ | 理由 |
|---|---|---|
| “Prisma 查询只写在 `modules/**/data/`” | 是 | 违反就是边界破坏 |
| “rsync 单文件部署必须用完整 target 路径” | 是 | 命令陷阱会反复踩 |
| “禁止裸跑 `systemctl stop worker`” | 是 | 红线，事故级 |
| “2026-05-08 timelineAt 上线，详见 docs/ARCHITECTURE.md” | 否 | 详细机制在 docs；agent 入口只需索引 |
| “修了 X bug 的复盘细节” | 否 | 单次事故归 learning / runbook 或删除 |

该进 attention：每次技能启动都该知道的一两行硬边界、命令陷阱、环境约束、路径约定。

不该进：历史叙事、详细机制、单次事故复盘、bug fix 流水账、已经由索引表覆盖的“详见 docs/Z”指针句。

---

## Phase 0：尺寸体检（防膨胀）

任何同步动作之前，先量关键文件：

```bash
wc -l CLAUDE.md AGENTS.md README.md 2>/dev/null
find docs .cyralis -path '*/.git' -prune -o -name '*.md' -print 2>/dev/null | xargs wc -l
```

再查项目内体量：

```bash
du -sh docs .cyralis 2>/dev/null
```

阈值和处理：

| 文件 | 上限 | 超过怎么办 |
|---|---|---|
| `.cyralis/attention.md` | 约 150 行 | 只留启动必读短规则；长解释毕业到 decision / learning / architecture |
| `CLAUDE.md` | 约 300 行 / 15KB，项目仍保留时才管理 | 先删历史叙事；规则收敛成表；详细机制迁 docs / `.cyralis/` |
| 单篇 docs | 约 1500 行；项目有更严格上限时按项目约束 | 拆分并建索引；若用户要求先确认，只列建议不擅自拆 |

额外查体量倒挂：健康态是项目文档承载稳定知识，`.cyralis/attention.md` 和项目文档都薄。若 attention 变厚，通常说明稳定知识放错了层。

**执行顺序**：先精简（破除膨胀）→ 再补本次增量。两件事不要混：精简时问“什么不该在这”，补漏时问“什么该补到这”。

---

## Phase 1：机械式枚举（不能跳）

先 `ls` / `find`，再判断。不要凭印象挑几个文件。

1. 读 `.cyralis/attention.md`。
2. 枚举 `.cyralis/`：
   - `ls .cyralis/`
   - `find .cyralis -maxdepth 3 -type f \( -name '*.md' -o -name '*.yaml' \) | sort`
3. 枚举项目根 markdown：
   - `README.md`
   - `CLAUDE.md`
   - `AGENTS.override.md`
   - `TEAM_GUIDE.md`
   - `.agents.md`
4. 枚举外部文档：
   - `ls docs/ 2>/dev/null`
   - `find . -maxdepth 2 -name '*.md' -not -path '*/node_modules/*' -not -path '*/.git/*' | sort`
5. 查项目内 agent 入口和 host skill 投影路径。路径速查见 `references/agent-paths.md`；只读当前仓库内实际存在的文件，不读写全局配置或全局 memory。
6. 回顾本次对话、当前 `git diff`、最近提交，确认本阶段发生了什么。

内部维护一张清单：每个文件标 `评估过 / 要改 / 不用改 / 需用户确认`。漏一个关键文档就不能进入落盘。

---

## Phase 2：变更影响矩阵

不要只看对话里新增了什么事实，要看事实会波及哪些文档层。先查 `references/sync-matrix.md`，再下判断。

常见映射：

- 新 API / 路由：`.cyralis/attention.md` 只放一行硬约束；详细规则进 `CLAUDE.md`（若项目仍保留）+ integration / dev guide + architecture routes。
- 新环境变量：agent 入口环境变量表 + README setup + runbook + 下游 integration guide。
- 新数据库表 / schema：architecture data model + dev guide；必要时 agent 入口加迁移 / 测试规则。
- 新大特性：requirements / architecture / roadmap / user guide / dev guide 都可能受影响。
- 新长期约束：decision + agent 入口执行规则；若每次 Cyralis 启动都得知道，再进 attention。
- 踩坑或调试路径：learning；如果会反复影响实现，再提炼一行进 agent 入口或 attention。
- 文档结构变化：README / docs index / agent 入口文档指针同步。

跨项目要特别小心：上游 API、SDK、子域、认证、共享环境变量、公共组件变化时，下游项目 docs 也要对齐。当前仓库改完不等于同步完成。

---

## Phase 3：实际修改

必须真的修改文件。只说“建议怎么改”不算完成。

推荐顺序：

1. `.cyralis/` 权威层：requirements / architecture / compound / attention。
2. README / docs：给人和下游看的安装、使用、集成、运维说明。
3. `.cyralis/attention.md`：只放每次技能启动都必须知道的短规则。
4. Host skill 投影：如果缺失或过期，提示运行 `cyralis update`，不要手写 `.codex/skills` / `.claude/skills` / `.pi/skills`。

编辑原则：

- **减优于加**：agent 入口净涨幅超过约 30 行就是红灯，回头查是不是在写历史叙事。
- **合并优于追加**：新信息是旧信息更新就改旧段；新增条目前先 grep 同关键词。
- **删除优于保留**：完成的临时计划、推翻的决策、过期记忆、单次事故流水账要删或归档。
- **毕业优于内部挪腾**：稳定知识不在入口文件里搬家，直接并进项目文档。
- **精确优于冗长**：一条记忆说一件事。
- **绝对时间**：写实际日期 `YYYY-MM-DD`，不写“今天 / 最近 / 上周”。
- **受众不混**：docs 不写“我记得上次”；agent 入口不抄 docs 全文。
- **指针不重复**：同一事实如果 docs 详写，agent 入口只在文档索引出现一次。

写入规则：

- `.cyralis/attention.md`：只放每次 Cyralis skill 启动都必须知道的短规则。
- `.cyralis/architecture/`：只写现状，不写未来计划。
- `.cyralis/requirements/`：写能力愿景和边界，不塞实现细节。
- `.cyralis/compound/`：仍使用 learning / trick / decision / explore；不要新增本技能专属 doc_type。
- `CLAUDE.md`：只在项目仍保留时写短规则、命令、禁区、索引；不写变更日志。
- README / docs：面向第一次接触项目的人，保持命令、API、环境变量和代码一致。
- 全局配置 / 全局 memory：不主动读取、不主动修改。项目专属事实只写项目根、`.cyralis/`、README 或 docs。

新增一个能力时，通常四处都要补：

1. integration / dev guide：怎么用。
2. architecture：怎么工作。
3. runbook / README：怎么运行和排障。
4. handoff / changelog 或 roadmap：已完成状态。

---

## Phase 4：自检清单

改完后逐项过，哪条不过就回去修。

尺寸 / 反膨胀：

- [ ] `.cyralis/attention.md` 净增长 ≤ 30 行；超了已删 / 迁历史叙事。
- [ ] 没新增“X 起 Y 上线，详见 docs/Z”式历史条目。
- [ ] 没在 agent 入口复制 docs 已有的详细机制。
- [ ] `.cyralis/attention.md` 没被写成长文。
- [ ] 没有体量倒挂：agent 入口和 attention 不应比项目 docs / `.cyralis/architecture` 更厚。

完整性 / 反漏改：

- [ ] Phase 1 枚举到的每个文件都有结论。
- [ ] 项目入口 / `.cyralis/` / docs 之间没有互相矛盾。
- [ ] agent 入口提到的路径、命令、工具、环境变量在代码中真实存在。
- [ ] README 的安装 / 运行 / 测试步骤跟代码一致。
- [ ] 新增 API：integration / dev guide 和 architecture 都出现。
- [ ] 新增环境变量：README / runbook 和 agent 入口都出现。
- [ ] 新增数据库表：architecture data model 和相关开发文档都出现。
- [ ] 跨项目影响已搜索并处理，或列入未处理原因。
- [ ] 没有相对时间残留：
  ```bash
  rg "今天|昨天|刚刚|最近|上周|today|yesterday|recently" .cyralis README.md docs CLAUDE.md 2>/dev/null
  ```
- [ ] `git diff` 只包含本次文档 / 知识库整理相关改动。

---

## Phase 5：变更摘要

所有文件修改完之后，再给用户摘要：

```markdown
## 文档整理完成

### Cyralis
- `.cyralis/attention.md` — ...
- `.cyralis/architecture/...` — ...
- `.cyralis/compound/...` — ...

### Agent 入口
- `CLAUDE.md` — ...
- `.cyralis/attention.md` — ...

### README / docs
- `README.md` — ...
- `docs/...` — ...

### Host 投影
- `cyralis update`：需要 / 不需要
- `.codex/.claude/.pi` 投影：...

### 未处理
- ...（需要用户确认或刻意跳过）
```

只列实际变更。没改的层级写“无变更”即可。

---

## 特殊情况

- 项目还没有 README 或 `.cyralis/attention.md`：如果已有可运行代码就创建；还在早期探索就跳过并说明。
- 对话没有产生新事实：仍要审查现有文档是否过期、冲突、含相对时间。
- 记忆之间出现无法判断的矛盾：列到“未处理”让用户决定；这是少数需要用户介入的情况。
- 跨项目改动：每个项目都跑一遍 Phase 1，不要假设上游文档改了下游就不用改。
- 发现之前同步漏了东西：直接修掉，不要说“那不是这次对话的事”。
- 用户明确要求先确认大文档拆分：只给拆分建议和依据，不擅自重组。

---

## 与其他技能的关系

| 技能 | 关系 |
|---|---|
| `cyralis init/update` | 仓库未接入或需要刷新投影时先运行；本技能不负责搭骨架 |
| `cs-guide` | 发现缺对外指南时建议或触发；已有指南过期可直接小修 |
| `cs-libdoc` | 公开 API 参考缺失或过期时建议 libdoc；本技能不批量生成 API 参考 |
| `cs-learn` / `cs-trick` / `cs-decide` / `cs-explore` | 发现稳定知识要归档时使用这些既有 doc_type |
| `cs-note` | 发现一两行启动必读硬约束时，可建议或更新 attention |
| `cs-feat-accept` / `cs-issue-fix` / `cs-feat-ff` | 阶段结束后触发 neat 做项目内同步 |

---

## 参考资料

- `references/sync-matrix.md` — 变化类型到文档层的映射
- `references/agent-paths.md` — 项目 agent 入口与 host skill 投影路径速查
