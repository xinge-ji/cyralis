# 收尾与独立评审

## 阶段收尾推荐

**feature-acceptance** 收尾按顺序判断：

1. `cs-learn`：沉淀经验
2. `cs-decide`：长期约束 / 选型
3. `cs-guide`：开发者 / 用户指南
4. `cs-libdoc`：公开 API 参考
5. `scoped-commit`

**issue-fix** 收尾按顺序判断：

1. `cs-learn`：坑点
2. `cs-decide`：暴露的长期约束
3. `cs-note`：项目每次启动都该知道的一两行硬约束 / 命令陷阱
4. `scoped-commit`

**feature-ff** 收尾按顺序判断（比标准 acceptance 短，没有 architecture / req 回写动作）：

1. `cs-learn`：动手过程暴露的坑
2. `cs-decide`：动手过程拍板的长期约束
3. `scoped-commit`

**统一规则**：一律一句话提示；用户说"不用"立即跳过；不强制；上游主动提示，下游承接执行。

## 代码独立评审 gate

`cs-feat-accept` / `cs-issue-fix` / `cs-refactor` 共用。它处理的是**一段已完成代码改动的独立 review**，不是 `cs-audit` 那种"我也不知道哪有问题，你先扫一遍"的主动扫描。

### 什么时候触发

默认不是每次都强制。命中任一条就要触发：

- **准备 merge / 准备宣告完成**，且改动不是小补丁
- **跨模块 / 跨目录边界**，或改了 public API / schema / persistence / permission / compatibility
- **verification 暴露证据缺口**——测试过了但关键结论仍缺证明，或某些行为只能靠口头保证
- **涉及旧 owner / fallback / adapter / duplicate branch / historical patch**，需要明确 retire、保留还是收缩
- **范围膨胀**——实现中触碰了原 design / analysis / refactor-design 没声明的文件或边界
- **行为等价风险高**——尤其 refactor 改动跨多文件、测试覆盖薄、调用方多

没命中这些条件时，不必为了形式补一个 review。

### 评审前必须准备好的输入

发起 review 前，至少能清楚给出：

1. **review scope**——这次到底评哪段改动
2. **成功依据**——对应的 design / analysis / refactor-design / requirement / architecture / accepted non-goals
3. **diff 边界**——git diff 范围、或最小可复核改动清单
4. **fresh evidence**——测试 / 日志 / 截图 / 手工验证 / grep / typecheck / lint
5. **compatibility boundary**——哪些已有行为 / 接口 / 数据形状不能坏
6. **retirement notes**——旧逻辑、fallback、adapter、临时补丁、重复 owner 这次该怎么处置
7. **review asks**——要 reviewer 重点看什么（例如 evidence sufficiency、architecture 对齐、退休条件是否清楚）

这些答不上来，先补材料，不要发一个"帮我看看这代码行不行"式的空 review。

### reviewer 输出格式

评审输出固定遵守：

- **findings first**——先列问题，后给总结
- 按 **Critical / Important / Minor** 分级
- 每条至少包含：`file:line`、问题是什么、为什么重要、怎么修（若不显然）
- 单独有一段 **Evidence Review**：哪些结论已经被证据证明，哪些仍未验证
- 最后给 **Assessment**：ready / with fixes / not ready

### 评审后的处理规则

- **Critical**：必须先修，不能带着继续推进
- **Important**：默认也先修；只有用户明确接受 residual risk，且不影响当前流程退出条件，才可记入遗留
- **Minor**：可记遗留，但不能拿来冲淡 Critical / Important
- reviewer 结论和本地证据冲突时，补跑缺失验证或给出具体反证；不要拿自信顶替证据

### 边界

- 这是**advisory gate**，不是 authoritative completion
- 跑过独立评审，**不等于**可以跳过 `cs-feat-accept` / `cs-issue-fix` / `cs-refactor` 自己的验证、落档、回写动作
- 评审发现 design / architecture / requirement 漂移时，要回对应 owner 修正；不要把"评审里提到过"当作已处理

## 收尾提交（scoped-commit）

acceptance / issue-fix 走完后把本次产物提交为一个 commit：

- **范围**：本次工作改到的代码 + 相关 spec 文档 + 本次实际更新过的架构 doc + 本次实际更新过的 roadmap items.yaml / 主文档
- **不该进**：和本次工作无关的顺手修改；属于"下次另起 feature / issue"的扩大范围
- **提交前确认**：用户没明确同意不要 `git commit`
- **commit message**：一句话说清"做了什么"，不贴 spec 目录路径

子技能只描述本阶段特有提交范围，通用规则看这里。
