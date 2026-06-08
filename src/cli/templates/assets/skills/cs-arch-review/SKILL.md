---
name: cs-arch-review
description: 架构改进专项审查，寻找让代码更可测试、更 AI 可导航的 deepening 候选。触发：用户说"改进架构"、"找架构重构机会"、"模块太浅"、"代码不好测试"、"哪里适合合并/拆 seam"、"让代码更好理解"。只发现和深化候选，不维护现状架构文档、不直接改代码。
---

# cs-arch-review

## 启动必读

本技能从代码和 Cyralis 现有文档里找**架构深化候选**：哪些 shallow module 可以合并成 deep module，哪些 seam 泄漏了实现细节，哪些测试穿过了错误的 interface，哪些调用方因为缺少 locality 被迫重复知道同一套规则。

它是 `cs-audit` 的架构专项分支，产出仍落在 `.cyralis/audits/`，但 `doc_type` 用 `arch-review-*` 和普通 audit 区分。它只发现和讨论候选；真正执行走 `cs-refactor`，大到跨 feature 的目标态走 `cs-roadmap`，已经拍板的长期约束走 `cs-decide`，现状地图更新走 `cs-arch`。

> 架构语言读同目录 `language.md`；候选判断读 `deepening.md`；报告模板读 `reference.md`；用户选中候选后要比较多个 interface 方案时读 `interface-design.md`。

---

## 和相邻技能的边界

| 用户要什么 | 走哪里 |
|---|---|
| 主动找 bug / 安全 / 性能 / 可维护性 / 架构偏离 | `cs-audit` |
| 主动找 deep module / shallow module / seam / test surface 改进机会 | 本技能 |
| 已经知道要重构哪块，且行为不变 | `cs-refactor` |
| 目标态很大，需要多条 feature 分步实现 | `cs-roadmap` |
| 维护 `.cyralis/architecture/` 现状地图 | `cs-arch` |
| 记录"以后不要再建议 X"或长期架构约束 | `cs-decide` |
| 只想问"这块现在怎么实现" | `cs-explore` |

**硬边界**：

- 不写 HTML 报告，不开浏览器，不把临时报告丢到 OS temp；报告写入 Cyralis 文档。
- 不读写 `CONTEXT.md` / `docs/adr/`；领域术语和决策来源改用 `.cyralis/requirements/`、`.cyralis/architecture/`、`.cyralis/compound/`。
- 不直接改代码、不创建 refactor checklist、不修改 `.cyralis/architecture/`。
- 不替用户拍板候选。用户选中后可以探索 interface 方案，但仍不执行。
- 不强依赖 subagent。能用 subagent 时可做 fresh pass；不能用时主 agent 自己完成。

---

## 文件放哪儿

```
.cyralis/audits/{YYYY-MM-DD}-{slug}/
├── index.md                 # 本次 arch review 总览
├── candidate-01.md
├── candidate-02.md
└── candidate-03.md
```

slug 取审查目标，如 `cli-installer-architecture`、`memory-runtime-testability`、`order-flow-deepening`。

---

## 工作流

### Phase 1：范围收敛

架构审查必须收窄范围。默认策略：

- 用户点名目录 / 模块 / 流程 → 就审那里
- 用户说"整个项目" → 建议先选最常改、最难测、最难读的一块
- 用户说"让代码更 AI 可导航" → 从入口模块 + `.cyralis/architecture/ARCHITECTURE.md` 指向的核心路径开始，不全仓库穷举

确认一句范围："这次审 `src/core` 和相关测试，重点找 shallow module、seam 泄漏和 test surface 问题。范围 OK 吗？"

### Phase 2：读取材料

必读：

- `.cyralis/attention.md`
- `.cyralis/architecture/ARCHITECTURE.md` 和范围相关 architecture doc
- `.cyralis/requirements/` 中范围相关 req
- `.cyralis/compound/` 中相关 `decision` / `explore` / `learning`
- 审查范围内的代码入口、关键类型、调用方、测试

检索示例：

```bash
python .cyralis/tools/search-yaml.py --dir .cyralis/compound --filter "doc_type=decision|explore|learning" --query "{关键词}"
python .cyralis/tools/search-yaml.py --dir .cyralis/compound --filter doc_type=decision --filter status=active --query "{关键词}"
```

读取目标不是复述代码，而是找 friction：理解一个概念要跳多少文件，调用方要知道多少实现规则，测试是否只能 mock 内部细节，现有 decision 是否禁止某类候选。

### Phase 3：探索候选

加载 `language.md` 和 `deepening.md`，用里面的词汇和判断法。重点找：

- shallow module：interface 几乎和 implementation 一样复杂
- pass-through module：删除后复杂度并不会集中，只是少了一层转发
- locality 缺失：同一条业务规则 / 状态规则 / 错误规则散在多个 caller
- seam 泄漏：caller 必须知道 seam 后面的实现细节才能用对
- test surface 错位：测试越过 module interface 去测 private helper / internal adapter
- adapter 失真：只有一个 adapter 却引入抽象，或两个真实 adapter 却没有稳定 seam
- 领域名词漂移：代码名、req 名、architecture 名、decision 名互相指不同东西

每个候选必须有证据：

- 涉及文件 / module
- 至少 2 条 `file:line` 证据，除非候选本来就是单文件内部问题
- 为什么是 architecture review 候选，而不是普通 bug / style / micro-refactor
- 与现有 decision / architecture doc 的关系；冲突只在 friction 足够真实时报告

候选强度三档：

- `Strong`：friction 反复出现，locality/leverage/testability 收益清楚，可形成后续 refactor 或 roadmap
- `Worth exploring`：问题真实但方案还需要更多约束
- `Speculative`：有迹象但证据不足，只适合做 follow-up explore

### Phase 4：产出 arch review

按 `reference.md` 写 `index.md` 和 `candidate-NN.md`。

推荐候选数量 3-7 条；少于 3 条可以接受，不硬凑。候选太多时只保留最能体现 depth/locality/leverage 的前 7 条，其余写进 index 的"未展开观察"。

`index.md` 末尾必须有 **Top recommendation**：建议先探索哪一条，理由必须落在 locality、leverage、test surface 或 seam placement 上。

### Phase 5：用户选择候选

把 index 摘要给用户，并问："你想先探索哪一条 candidate？"

用户可能选择：

- **执行**：路由到 `cs-refactor`；如果跨多个 feature / 需要先定义目标态接口契约，路由到 `cs-roadmap`
- **继续设计 interface**：进入 Phase 6
- **拒绝候选**：如果拒绝理由是长期有效、非显然、未来 review 容易重复踩到，建议触发 `cs-decide` 记录约束；本技能不直接写 decision
- **只存档**：结束

### Phase 6：Interface exploration（可选）

用户明确想看某个候选怎么设计 interface 时才进入。读取 `interface-design.md`。

输出 2-4 个明显不同的 interface 方案，比较：

- depth：每个 interface 提供多少 leverage
- locality：变化 / bug / 知识会集中在哪里
- seam placement：seam 放在哪，哪些 adapter 是真实需要的
- testing：哪些旧测试会删，哪些新测试会穿过 module interface
- rollout：后续适合 `cs-refactor` 还是 `cs-roadmap`

这一步只给方案和权衡，不生成 checklist，不改代码。

---

## 退出条件

- [ ] 范围已确认，不是全仓库盲扫
- [ ] 已读取相关 `.cyralis/architecture` / `requirements` / `compound` 材料
- [ ] 候选使用 `language.md` 的 module / interface / seam / adapter / depth / leverage / locality 词汇
- [ ] 每条候选有 `file:line` 证据和 recommendation strength
- [ ] 报告写入 `.cyralis/audits/{YYYY-MM-DD}-{slug}/`
- [ ] 没有写 HTML、没有打开浏览器、没有写 `CONTEXT.md` / `docs/adr`
- [ ] 没有改代码、没有改 `.cyralis/architecture/`
- [ ] 已给出 Top recommendation 和下一步路由

---

## 来源与改写说明

本技能改写自 Matt Pocock 的 `improve-codebase-architecture` skill。保留其 deep module、interface、seam、adapter、locality、leverage、deletion test 等判断语言；报告落点、领域术语来源、决策记录和后续执行路径已改为 Cyralis 原生工作流。
