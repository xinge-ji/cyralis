# Decision Hygiene Review

本文件提供方向性选择前的轻量 review 口径。它不是独立 workflow，不产出单独 artifact，不改变 `work.json` 状态；只帮助当前 `cs-*` 技能把决策面清理干净。

## 1. 触发信号

命中任一条才用：

- 用户显式说 first principles / 第一性原理 / Occam / 奥卡姆剃刀
- 有 2 个以上可行方案，但选择标准不清
- 目标、非目标、硬约束、成功标准仍含糊
- 新 owner / duplicate owner / fallback / adapter / compatibility path 出现
- 最小 diff 可能只是 local patch，不是在 canonical owner 修 bug class
- 方案声称"更长期稳定 / 更干净架构"，但证据不足

不要用于：简单问答、状态汇报、已批准方案的机械执行、低风险单 owner 小改。

## 2. 五行检查

```text
第一原则：必须满足的不可约结果是什么？
不可破坏：哪些约束不能破？
该丢的假设：哪些只是习惯、历史形状或未证偏好？
最小充分路径：满足第一原则的最低复杂度方案是什么？
升级信号：发现什么时必须回 design / roadmap / arch / issue-analyze？
```

## 3. 方案卫生升级

复杂方向选择时使用：

```text
不变量：
- 非谈判目标：
- 非谈判约束：
- 应删除的历史假设：

Owner / 退休矩阵：
- 新 canonical owner：
- 旧 owner：
- compat-only carrier：
- 删除优先 / 退休触发：

证伪矩阵：
- 依赖移除测试：
- 反例场景：
- 必须失败 / 降级 / 保持正确的情况：

结论：
- adopt / revise / reject / needs evidence：
- blocking gaps：
- next evidence：
```

## 4. 边界

- 证据优先：代码、`.cyralis/` 文档、测试、日志、用户明确约束优先；缺证据写 `unknown`
- advisory only：只能建议回哪个 workflow，不替用户拍板，不生成 decision
- 没改变决策面就立刻回到当前 skill
