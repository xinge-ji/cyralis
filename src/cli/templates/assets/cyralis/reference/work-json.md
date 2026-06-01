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

- design -> implement：需要 `artifacts.design.approval=approved`，且 checklist 已生成
- implement -> verify：需要 `artifacts.implementation.done=true`，且已有实现总结或 checklist steps 全部完成
- verify -> done：需要 `artifacts.acceptance.result=passed`
- verify -> implement：`artifacts.acceptance.result=failed`

状态变更应由代码或明确的状态管理 helper 写入，不由 prompt 自己声称完成。
