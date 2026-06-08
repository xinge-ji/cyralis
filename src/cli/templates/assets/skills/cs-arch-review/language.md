# 架构审查语言

本文件定义 `cs-arch-review` 使用的统一词汇。报告里优先使用这些词，不要随意换成近义词导致建议不可比较。

## Terms

**Module**

有 interface 和 implementation 的任何东西。尺度不固定，可以是函数、class、package、目录、跨层 slice。不要只把 module 理解成语言级模块。

**Interface**

caller 为了正确使用 module 必须知道的全部信息：类型签名、invariant、调用顺序、错误模式、配置、性能特征。不要只把 interface 理解成 TypeScript `interface` 或 public methods。

**Implementation**

module 里面的代码。讨论 seam 时不要把 implementation 和 adapter 混用：adapter 是满足某个 interface 的具体实现角色。

**Depth**

interface 的 leverage。caller 学很小的 interface，就能得到很多行为时，这个 module 是 **deep**；caller 要知道的 interface 几乎和 implementation 一样复杂时，这个 module 是 **shallow**。

**Seam**

可以替换行为而不在原地编辑的地方，也就是 module interface 所在的位置。不要泛泛说 boundary；Cyralis 的架构文档里如果需要描述模块归属可以说边界，但本技能讨论可替换点时说 seam。

**Adapter**

满足某个 seam 上 interface 的具体东西。它描述角色，不描述里面代码多不多。

**Leverage**

caller 从 depth 得到的收益：一小块 interface 覆盖多个调用方、多种行为、多条测试。

**Locality**

maintainer 从 depth 得到的收益：变化、bug、知识和验证集中在一个地方，而不是散在多个 caller。

## Principles

- **Depth 是 interface 的属性，不是 implementation 行数。** implementation 很长不代表 deep；如果 caller 也要知道同样多规则，仍然 shallow。
- **Deletion test。** 想象删除这个 module：如果复杂度直接消失，它多半只是 pass-through；如果复杂度会重新散落到 N 个 caller，它正在提供 locality。
- **Interface is the test surface。** caller 和测试应该穿过同一个 seam。测试需要绕过 interface 才能验证行为，说明 module shape 可能不对。
- **One adapter = hypothetical seam. Two adapters = real seam.** 没有真实变化点时不要引入 port；如果已经有 production + test 或多个 production adapter，就需要认真设计 seam。

## Relationships

- 一个 **Module** 对 caller 暴露一个 **Interface**。
- **Depth** 描述 Module 相对 Interface 的 leverage。
- **Seam** 是 Interface 所在的位置。
- **Adapter** 坐在 Seam 上，满足 Interface。
- **Depth** 给 caller 带来 **Leverage**，给 maintainer 带来 **Locality**。

## 避免的说法

- 不把 depth 写成 implementation 行数 / interface 行数的比例。
- 不把 interface 缩窄成语言类型签名。
- 不用"更干净"、"更优雅"当收益；改成 locality、leverage、test surface、seam placement 的具体收益。
