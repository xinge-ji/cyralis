# Compound 归档规则

## 归档检索规则

feature-design / issue-analyze / issue-fix 动手前到 `.cyralis/compound/` 搜已有沉淀：

- 总是先搜 `architecture/` 和 `compound/`
- 在 `compound/` 用 `doc_type` 过滤（learning / trick / decision / explore）
- 搜到的结果只作参考输入，不盲目套用——可能已 `outdated` 或不适合当前上下文
- 搜到和当前方向冲突的 decision -> **必须**正面回应"为什么仍然这么做"或调整方向

子技能只补本阶段查询命令。完整搜索语法看 `.cyralis/reference/tools.md`。

## 归档类子技能共享守护规则

`cs-learn` / `cs-trick` / `cs-decide` / `cs-explore` 共享下面这组规则。子技能正文只写特有反模式，通用看这里：

1. **只增不删**——已归档除非被明确取代（`status=superseded`）否则不删；理由丢失成本极高
2. **宁缺毋滥**——用户说不出理由的节直接省略，不要 AI 编造
3. **不替用户写实质内容**——AI 负责起草结构和串联语言，实质结论必须来自用户或可追溯的代码证据
4. **启动 notes 检查**——写完后若沉淀暴露出"每次启动都该知道"的一两行硬约束，提示用户用 `cs-note` 追加到 `AGENTS.md`；不要直接改外部 AI 入口
5. **起草前先查重叠**——动手写前用 `search-yaml.py --query` 查语义相近的旧文档。命中就把候选列给用户在三条路径里选：
   - **更新已有**（默认优先）：沿用原文件名和原创建日期，**不新建**；frontmatter 补 `updated: YYYY-MM-DD`；超出小修在文末加"YYYY-MM-DD 更新"简述
   - **supersede**：旧文档保留原文，`status: superseded` + `superseded-by: {新文件名}`，正文顶部加 `**[已取代]** 见 {新 slug}`；新文档 frontmatter 带 `supersedes: {旧文件名}`
   - **确实是不同主题**：新建，文末"相关文档"列出已有那条说明区别
6. **识别用户意图是"改已有"还是"记新的"**——用户说"改 / 更新 / 修订 / 补充 {某条}"、明确指向某条旧文档、或话题高度重合时默认走"更新已有"，不要闷头新建。分不清就问。
7. **同步 recall projection**——归档 / 更新 / supersede 完成后运行 `cyralis memory sync --kind compound --source {路径}`；如果旧文档被标成 `superseded` / `outdated`，旧路径也要 sync 一次让旧 projection 被清理

各子技能只认自己的 `doc_type`，不读写别家产物。
