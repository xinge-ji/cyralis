# 元数据与产物口径

## Feature spec

brainstorm / intent / design / acceptance 共用 `doc_type` / `feature` / `summary` / `tags`，fastforward 的 ff-note 也使用这组基础字段。子技能只补特有字段。

标准流程 feature 的 workflow status 不写进 markdown frontmatter，统一写在同目录 `work.json.status`，取值只允许 `design` / `implement` / `verify` / `done`；没有 active work 时由 session resolver 输出 `no_task`。design 的草稿 / 批准状态写在 `work.json.artifacts.design.approval`，取值 `draft` / `approved`。

## Issue spec

report / analysis / fix-note 共用 `doc_type` / `issue` / `status` / `tags`。report / analysis 的 `status` 使用 `draft` / `confirmed`；fix-note 的 `status` 使用 `fixed` / `mitigated` / `partial`：

- `fixed` 表示验证证据达到至少 `B` 置信度并可声明修复完成
- `mitigated` 表示只做了有边界的缓解不能宣称根因修复
- `partial` 表示仍有残留或证据缺口

`severity` / `root_cause_type` / `path` 由对应阶段按需补。

issue 标准路径和快速通道都要遵守 issue 调试治理 reference。快速通道不产出 report / analysis，也不进入 verify 状态；它通过 `work.json.status=implement` + `artifacts.fix.quick_lane=true` 直接路由到 `cs-issue-fix`，完整事实落在 `{slug}-fix-note.md`。analysis / fix-note 正文承载调试治理字段，不强制把 `diagnostic_layer`、`canonical_owner`、`confidence` 等字段塞进 frontmatter，避免 frontmatter 变成第二份分析文档。

## Behavior Evaluation

只要 feature 会改变用户可见流程、系统可观察结果、错误 / 回退路径、跨步骤不变量，就写这个小节。它必须写具体场景、可观察证据、期望结果、failure signal、correction path，必要时补 invariant。纯技术任务不写，直接标 `technical-only`。

## Behavior Coverage

plan / checklist 对 Behavior Evaluation 的映射。只有任务真的对应某个场景或验证证据时才写；没有直接对应关系就写 `technical-only`，不要硬造场景。

## 归档类（compound）

- learning / trick / decision / explore 四类**统一写入 `.cyralis/compound/`**
- 每个文档 frontmatter 顶部带 `doc_type`（learning / trick / decision / explore）作跨子技能归属判定
- 文件名 `YYYY-MM-DD-{doc_type}-{slug}.md`——日期打头便于 `ls` 排序，type 段在中间便于 grep
- 各子技能在 `doc_type` 之外保留专属 frontmatter（learning 的 `track` / trick 的 `type` / decision 的 `category` / explore 的 `type`）
- 各子技能只认自己的 `doc_type` 不读写别家
- `status` 等通用字段语义和本文件保持一致

## Memory projection

- `.cyralis/architecture/` 和 `.cyralis/compound/` 是 source of truth，`.cyralis/memory/projections/` 只是可重建的 recall 入口
- 写入 / 更新 / supersede / 标 outdated 后，负责落盘的技能必须运行 `cyralis memory sync`，让未来会话能通过 recall hint 找到 source doc
- compound 单文件落盘后优先运行 `cyralis memory sync --kind compound --source {path}`；architecture 可能同步索引 / 搬迁同类文件，落盘后运行 `cyralis memory sync --kind architecture`
- projection stub 只放标题、摘要、tag、source 路径和短 excerpt；不要把全文复制进默认 `[project_context]`

## 外部读者文档

guidedoc / libdoc 的 frontmatter 由各自子技能定义。无特殊说明：`draft` = 待 review，`current` = 当前有效，`outdated` = 代码已变更待同步。

## 写作约束

子技能提字段时优先写"额外字段"或"阶段状态变化"，不重复展开整套通用字段。
