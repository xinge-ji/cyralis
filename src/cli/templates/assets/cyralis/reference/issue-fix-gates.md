# Issue 修复 Gates

## 修复前 gate

`cs-issue-fix` 动手前必须具备：

- report 或快速通道摘要里有复现信号
- analysis 或快速通道摘要里有 root cause + canonical owner
- 有 failing test、可重复命令、可执行复现步骤，或写清为什么只能人工验证
- Patch-Shape / Minimality / Pre-Edit Complexity 已按风险触发
- 选定方案的改动范围和 non-edits 已明确

如果真正 canonical owner 超出 analysis 或快速通道摘要声明的文件范围，停下来更新分析 / 让用户重新确认边界；快速通道需要改走标准路径时，不要在 fix 阶段偷偷扩范围。

## 完成前 gate

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

## Repair / Retirement 双轨

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
