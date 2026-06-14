# Issue Patch-Shape Triage

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
