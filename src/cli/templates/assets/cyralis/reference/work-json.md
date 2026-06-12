# work.json 状态协议

work.json 是 Cyralis workflow 的状态事实源。

---

## 1. 最小结构

```json
{
  "schema": 1,
  "id": "2026-05-31-example-feature",
  "mode": "feature",
  "status": "design",
  "title": "Example feature",
  "slug": "example-feature",
  "root": ".cyralis/features/2026-05-31-example-feature",
  "parent": null,
  "artifacts": {
    "brainstorm": {
      "path": null
    },
    "intent": {
      "path": null
    },
    "design": {
      "required": true,
      "path": "example-feature-design.md",
      "approval": "draft"
    },
    "checklist": {
      "path": "example-feature-checklist.yaml"
    },
    "implementation": {
      "done": false
    },
    "acceptance": {
      "path": "example-feature-acceptance.md",
      "result": null
    }
  }
}
```

---

## 2. workflow status

只允许：

- no_task
- design
- implement
- verify
- done

work item 通常不写 no_task；没有 active work 时，session resolver 输出 no_task。

---

## 3. artifact 字段

design.approval 可以是 draft / approved。

acceptance.result 可以是 passed / failed / skipped / null。

这些字段不是 workflow status。它们只是 resolver 判断能否推进 status 的证据。

design 文档不写 `draft` / `approved`；批准状态只写 `artifacts.design.approval`。迁移旧文档时如果 frontmatter 仍有旧状态字段，以 `work.json` 为准。

---

## 4. transition 规则

状态变更统一通过：

```bash
python .cyralis/tools/work.py transition <work-dir> <target-status>
```

resolver / hook 只读状态；prompt 不直接手写 `work.json.status`。

### feature

- design -> implement：需要 `artifacts.design.approval=approved`，且 checklist 已生成
- implement -> verify：需要 `artifacts.implementation.done=true`，或 checklist steps 全部完成
- verify -> done：需要 `artifacts.acceptance.result=passed`
- verify -> implement：`artifacts.acceptance.result=failed`

### issue

issue mode 使用同一组 workflow status，但语义映射为：

- design = report
- implement = analyze（标准路径）或 quick-lane fix（快速通道）
- verify = standard-path fix

transition：

- design -> implement：需要 report confirmed
- implement -> verify：需要 analysis confirmed
- implement -> done：快速通道专用，需要 `artifacts.fix.quick_lane=true`、`artifacts.fix.result=passed`，且 fix-note 已生成
- verify -> done：需要 `artifacts.fix.result=passed`，且 fix-note 已生成
- verify -> implement：`artifacts.fix.result=failed`

### refactor

refactor mode 映射：

- design = scan + refactor design
- implement = apply checklist
- verify = final verification / review gate

transition：

- design -> implement：需要 scan user-reviewed（fastforward 可标 `artifacts.scan.required=false` 跳过）、design approved、checklist 已生成
- implement -> verify：需要 `artifacts.apply.done=true` 或 checklist steps 全部完成
- verify -> done：需要 `artifacts.verification.result=passed`
- verify -> implement：`artifacts.verification.result=failed`

状态变更应由代码或明确的状态管理 helper 写入，不由 prompt 自己声称完成。
