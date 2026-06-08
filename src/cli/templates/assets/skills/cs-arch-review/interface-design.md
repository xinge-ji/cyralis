# Interface Exploration

用户选中某个 candidate 并要求继续设计时，才读取本文件。

目标是比较多个可能的 interface，不执行实现。输出应该让用户能决定后续走 `cs-refactor` 还是 `cs-roadmap`。

## Step 1：框定问题空间

先给出一段面向用户的 problem framing：

- 当前 candidate 的 module / interface / seam 是什么
- 哪些 caller 受影响
- 依赖属于 `deepening.md` 的哪一类
- 哪些现有 decision / architecture doc 是硬约束
- 哪些行为必须保持不变
- 哪些测试应该保留，哪些测试可能被新 interface 替换

可以写一小段 illustrative code sketch，但只能用来说明约束，不要把它当成推荐方案。

## Step 2：提出 2-4 个明显不同的 interface

每个方案都写：

1. **Interface**：入口、参数、返回、invariant、ordering、error modes
2. **Usage example**：caller 如何使用
3. **Hidden implementation**：哪些现有 shallow modules 会被吸收到后面
4. **Dependency strategy**：依赖分类、adapter 是否真实需要
5. **Testing strategy**：测试穿过哪个 seam，删掉哪些旧测试
6. **Trade-off**：leverage / locality / migration risk

方案要真的不同，不要只换命名。可用的对比方向：

- 最小 interface：1-3 个入口，最大化每个入口的 leverage
- 常见 caller 优先：让主路径最简单，边缘场景显式处理
- Flexibility 优先：支持更多用例，但说明 interface 变宽的成本
- Ports & adapters：当依赖是 remote but owned 或 true external 时，把 transport 放到 adapter

## Step 3：比较和推荐

按这几个维度比较：

- **Depth**：caller 学多少 interface，换来多少行为
- **Locality**：变化 / bug / 规则集中在哪里
- **Seam placement**：seam 放在调用方、module 外部、module 内部的差异
- **Adapter reality**：是否真的有两个 adapter 支撑这个 seam
- **Test surface**：测试是否能只穿过 public interface
- **Rollout shape**：单次 `cs-refactor` 能否做完，还是需要 `cs-roadmap`

最后给一个明确推荐。如果推荐混合方案，说清楚混合的是哪两个方案的哪些部分。

## 禁止

- 不生成 checklist。
- 不改代码。
- 不把方案写进 `.cyralis/architecture/`，除非后续实现落地并由 `cs-arch` / acceptance 同步。
- 不把未拍板方案写成 decision。
