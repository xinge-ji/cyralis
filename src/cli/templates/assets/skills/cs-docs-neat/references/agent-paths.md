# 项目 Agent 入口与 Host 投影路径速查

执行 `cs-docs-neat` 时只检查当前仓库内实际存在的文件。不要主动读取或修改 `~/.claude/`、`~/.codex/`、`~/.config/opencode/` 等全局配置或全局 memory。

## 项目根 Agent 入口

| 文件 | 用途 |
|---|---|
| `CLAUDE.md` | Claude Code 项目级指令 |
| `AGENTS.override.md` | Codex 同目录 override，存在时必须读 |
| `TEAM_GUIDE.md` / `.agents.md` | 部分团队或工具的 fallback 入口，存在时读 |

这些文件需要同步，但只放 agent 执行需要的规则、命令、红线、文档索引；不要变成项目 changelog。

## Host Skill 投影

| Host | 项目内投影 |
|---|---|
| Codex | `.codex/skills/` |
| Claude Code | `.claude/skills/` |
| Pi | `.pi/skills/` |

这些目录由 `cyralis init/update` 生成。发现缺失、过期或与 `.cyralis/` 口径不一致时，提示运行 `cyralis update`；不要手写投影目录里的 skill。

## Cyralis 权威层

| 路径 | 用途 |
|---|---|
| `.cyralis/attention.md` | Cyralis skill 启动必读短规则 |
| `.cyralis/reference/` | 工作流共享口径 |
| `.cyralis/architecture/` | 当前架构事实 |
| `.cyralis/requirements/` | 当前能力需求和边界 |
| `.cyralis/compound/` | learning / trick / decision / explore |

项目事实优先写入 Cyralis 权威层或 README/docs，再由 host 入口保留短规则和索引。

## 全局边界

全局 agent 配置或 memory 只在用户显式要求并明确改变边界时处理。默认情况下，项目专属事实禁止写全局；如果用户贴来外部 memory 内容，只把它当输入材料，毕业到项目文档后让用户自行处理外部副本。
