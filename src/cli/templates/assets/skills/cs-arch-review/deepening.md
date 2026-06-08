# Deepening 判断法

本文件用于判断一个候选是否值得从 shallow modules 深化成 deep module。

## 依赖分类

候选是否适合 deepening，先看依赖属于哪类。

### 1. In-process

纯计算、内存状态、无 I/O。通常最适合 deepening：合并 shallow modules 后直接通过新 interface 测试。

判断信号：

- 多个函数 / class 在同一进程内互相转发
- caller 需要按固定顺序调用多个 helper
- 测试大量 mock 内部函数，只为避开组合逻辑

### 2. Local-substitutable

有 I/O，但有本地替身可用于测试，如内存文件系统、PGLite、本地 fake server。可以 deepening，但 seam 多半是 implementation 内部 seam，不一定要暴露到外部 interface。

判断信号：

- production 依赖真实 I/O
- 测试可以用本地替身跑完整行为
- caller 不应该知道 I/O 细节

### 3. Remote but owned

跨网络调用自己的服务。通常需要 port + adapter：deep module 拥有逻辑，传输细节通过 adapter 注入。生产用 HTTP/gRPC/queue adapter，测试用 in-memory adapter。

判断信号：

- 业务规则散在 caller 和远端 client 两侧
- caller 需要知道 endpoint 顺序 / retry / partial failure 细节
- 已有多个 owned transport 或测试替身

### 4. True external

第三方服务。不要把第三方 SDK 泄漏给业务 caller；deep module 接收一个窄 port，测试提供 mock adapter，production 提供真实 adapter。

判断信号：

- Stripe / Twilio / GitHub / OpenAI 等外部服务 SDK 类型穿透到核心代码
- 错误码 / retry / rate limit 规则散在多个 caller
- mock 设置比被测行为更复杂

## Seam discipline

- **一个 adapter 只是猜想 seam。** 只有 production adapter，没有 test adapter 或第二种 production adapter 时，小心过度抽象。
- **两个 adapter 才是真 seam。** production + in-memory test adapter 通常足够证明 seam 真实存在。
- **区分 internal seam 和 external seam。** deep module 内部可以有测试用 seam，但不要因为测试需要就把所有内部 seam 暴露给 caller。
- **seam placement 是设计决定。** 发现候选时只描述 seam 放在哪里可能更有 locality，不在 review 阶段直接拍板。

## Testing strategy

deepening 后测试应该替换而不是叠加：

- 旧 shallow module 的 unit tests 很可能变成废测试；新测试应穿过 deep module 的 interface。
- 测试断言 observable behavior，不断言 internal call count / private state。
- 如果 implementation 改了但行为没改，测试不应该失败。
- 如果 caller 必须 mock module 内部 collaborator 才能测，interface 可能太浅。

## 候选是否够强

强候选通常满足三条以上：

- 删除 shallow module 后，复杂度会散落到多个 caller，而不是消失
- 同一规则在 3 个以上 caller / tests 中重复
- 测试绕过 interface 或大量 mock internal collaborator
- caller 需要知道错误处理、ordering、config、cache、retry 等 implementation 细节
- 已有两个真实 adapter，但 seam 没有被命名和稳定下来
- 现有 architecture doc / decision 已经暗示了概念，但代码没有形成对应 module

弱候选通常是：

- 单纯命名口味
- 只有一个调用方且没有测试痛点
- 只是文件太长，但 interface 和 locality 没问题
- 会改变外部行为，却没有需求 / roadmap 承接
- 违反 active decision，且没有足够 friction 支撑重开讨论
