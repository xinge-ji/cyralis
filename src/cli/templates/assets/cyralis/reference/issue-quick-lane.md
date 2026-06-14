# Issue 快速通道

issue 快速通道只适用于低风险、单 owner、证据明确的问题。必须同时满足：

- 有清楚的复现信号或可重复 failing test / 命令
- AI 能明确指出 `{file}:{line}` 和实际原因
- canonical owner 单一且就在修复点
- 改动预计 1-2 处，不碰 shared / core / cross-module 行为
- 不涉及 public contract、数据 contract、source-of-truth、fallback、adapter、duplicate owner
- 不靠 keyword / regex / sample exception / local guard 掩盖症状
- 验证路径清楚，修完能直接证明原复现不再异常

任一条件不满足，走标准路径：report -> analyze -> fix。
