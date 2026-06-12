# Issue 调试治理

## 1. 总原则

看到 bug、测试失败或异常行为时，先找证据化根因，再修。禁止用"先试一个小改动看看"代替诊断。

调试顺序：

```text
症状 / 报错 -> 复现信号 -> 最近变更 -> 数据流 / 调用链 -> 诊断层级上钻 -> canonical owner -> 最小充分修复 -> 验证 -> repair / retirement 收尾
```

最小充分修复不是最小 textual diff，而是：

- 修在 canonical owner 上
- 修的是 bug class，不只是当前样本
- 没有无边界增加 fallback / branch / adapter
- 旧 owner、旧 fallback、历史补丁有删除或保留理由

## 2. 诊断层级

从 L1 开始，逐层问"为什么"。只在证据显示没有更深原因，或遇到 T-class 边界时停止。

| 层级 | 问题 |
|---|---|
| L1 Symptom | 具体什么失败？哪里失败？能否复现？ |
| L2 Logic | 哪个分支、状态转换、不变量错了？ |
| L3 System | 哪个组件边界、依赖、所有权交界处失效？ |
| L4 Architecture | 哪个设计选择、重复 owner、fallback 链导致问题？ |
| L5 Cross-system Contract | 哪个 API / 数据 / 时序 / SLA contract 不成立？ |
| L6 Platform | 哪个运行时、OS、框架或宿主约束导致问题？ |
| L7 Spec Gap | 谁没有定义这个场景的正确行为？ |

当停止层影响修复边界、contract owner、产品语义或用户需要拍板时，在 analysis 里写 `Layer Stop Card`：

```text
Layer Stop Card:
- Current Stop Layer:
- Checked Path:
- Evidence For Stop:
- Excluded Layers:
- Falsifier:
- User Intervention Point:
- Next Action:
```

## 3. 快速通道准入

issue 快速通道只适用于低风险、单 owner、证据明确的问题。必须同时满足：

- 有清楚的复现信号或可重复 failing test / 命令
- AI 能明确指出 `{file}:{line}` 和实际原因
- canonical owner 单一且就在修复点
- 改动预计 1-2 处，不碰 shared / core / cross-module 行为
- 不涉及 public contract、数据 contract、source-of-truth、fallback、adapter、duplicate owner
- 不靠 keyword / regex / sample exception / local guard 掩盖症状
- 验证路径清楚，修完能直接证明原复现不再异常

任一条件不满足，走标准路径：report -> analyze -> fix。

## 4. Patch-Shape Triage

第一个看起来显然的修法只能当线索，不能直接当动手许可。候选修复命中下面任一形状时，必须继续上钻或在 analysis 里证明当前层就是 canonical owner：

- keyword / phrase / regex / negation list / sample-text exception
- local guard / extra conditional / try-catch / early return / one-off branch
- fallback / adapter / compatibility branch / legacy path expansion
- consumer / caller / readiness / presentation-layer patch
- 下游重新 parse raw text，而上游已有 typed intent / normalized state / source-of-truth
- artifact / download / export / cache 症状补丁，但没有先定位 producer owner
- duplicate parsing / duplicate owner / "先两套都保留"
- 只修观察到的样本文案或输入，没有证明 bug class

命中时在 analysis 或 fix 前摘要里写：

```text
PatchShape:
CanonicalOwner:
UpwardDrillSignal:
Decision: fix owner | continue investigation | escalate
```

如果诱惑是"只加一个 guard / fallback"，再写：

```text
Minimality Check:
- Smallest textual diff:
- Correct owner:
- Bug class fixed:
- New branch/fallback added:
- Old path retired or scheduled:
- Verdict: sufficient repair | local patch | needs decision-hygiene review
```

`local patch` 只能作为 mitigation；除非它本身就在 canonical owner，且写清 retention reason 和 retirement trigger，否则不能当成根因修复。

`needs decision-hygiene review` 表示回到 `cs-issue-analyze`，读取 `.cyralis/reference/decision-hygiene.md`，用五行检查或方案卫生升级重新判断 canonical owner / Repair Track；不触发独立 skill。

修复点落在大文件、大函数、generic helper、fallback / adapter / guard 路径，或 owner fit 不清楚时，再写 Pre-Edit Complexity Check：

```text
Pre-Edit Complexity Check:
- Target edit file:
- Existing pressure signal:
- Owner fit:
- Safer edit boundary:
- Decision: edit-in-place | extract helper | add owner file | split task | pause for plan update
```

如果 safer boundary 会改变 analysis 里的 Fix Boundary，先回 analysis 更新方案并让用户确认。

## 5. 修复前 gate

`cs-issue-fix` 动手前必须具备：

- report 或快速通道摘要里有复现信号
- analysis 或快速通道摘要里有 root cause + canonical owner
- 有 failing test、可重复命令、可执行复现步骤，或写清为什么只能人工验证
- Patch-Shape / Minimality / Pre-Edit Complexity 已按风险触发
- 选定方案的改动范围和 non-edits 已明确

如果真正 canonical owner 超出 analysis 或快速通道摘要声明的文件范围，停下来更新分析 / 让用户重新确认边界；快速通道需要改走标准路径时，不要在 fix 阶段偷偷扩范围。

## 6. 完成前 gate

宣告修复完成前，必须检查：

```text
Debugging Closure:
- Reproduction before:
- Verification after:
- Canonical owner:
- Same-pattern search:
- H-class signals:
- Repair Track:
- Retirement Track:
- Confidence: A | B | C
```

H-class 任一命中，默认不能说完成，必须继续诊断或记录为有边界的 mitigation：

- 修复新增 local branch / fallback / adapter，但没有 retirement trigger
- 修复在 consumer / caller，而上游 owner 仍可能拥有正确性
- 同类 bug pattern 在仓库里还存在
- 原复现仍有异常
- 历史上同症状修过但又复发，且没有读旧 diff
- 只修样本，没有证明 bug class

Confidence 口径：

- `A`：直接证据 + 回归覆盖都支撑根因结论
- `B`：证据强，但覆盖有限或有边界未知
- `C`：只有部分证据；不能用"已彻底修复"表述

完成声明至少需要 `B`。如果只能达到 `C`，fix-note 必须写成 mitigation / partial，并列出需要用户或环境补齐的证据。

## 7. Repair / Retirement 双轨

所有非平凡 issue fix 都要有双轨收尾。

Repair Track 必须回答：

- 真正 root cause 是什么
- canonical owner 是谁
- 最小必要改动是什么
- 兼容边界和 non-goals 是什么
- 用什么验证

Retirement Track 必须回答：

- 是否存在旧 owner / fallback / adapter / historical patch
- 旧路径是否还在主链路上
- 能删则本次删；不能删则写 retention reason
- 保留的观察指标和 retirement trigger 是什么

不要新增 provider / fallback / prompt branch / adapter，而不说明旧路径怎么处理。
