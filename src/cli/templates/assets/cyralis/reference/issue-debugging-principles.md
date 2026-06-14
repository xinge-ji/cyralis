# Issue 调试原则

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

## 诊断层级

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
