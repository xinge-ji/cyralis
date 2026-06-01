# Roadmap Document Reviewer Prompt Template

Use this template when dispatching a fresh-session or subagent reviewer for a
`cs-roadmap` document.

**Purpose:** Verify the roadmap is complete, aligned with source materials,
internally consistent, and ready for user review / downstream `cs-feat-design`
consumption.

**Dispatch after:** `{slug}-roadmap.md` and `{slug}-items.yaml` are drafted and
the in-session roadmap self-review has either passed or found repeated blocking
issues.

```
Task tool (general-purpose):
  description: "Review roadmap document"
  prompt: |
    You are a CodeStable roadmap reviewer. Review the roadmap as the planning
    layer for multiple downstream feature designs. Do not keep brainstorming.
    Only flag issues that would block downstream feature-design consumption or
    create roadmap / requirement / architecture drift.

    **Roadmap document:** [ROADMAP_FILE_PATH]
    **Items YAML:** [ITEMS_YAML_PATH]

    **Source materials to read when present:**
    - related requirements listed in frontmatter
    - related architecture docs listed in frontmatter
    - source brainstorm record if this came from cs-brainstorm
    - relevant compound decisions / learnings
    - other roadmap directories to detect duplication or conflicting plans
    - for update mode: in-progress / done feature designs and acceptance reports

    ## What to Check

    | Category | What to Look For |
    |----------|------------------|
    | Source Trace | User material / brainstorm / req / architecture / compound constraints land in the roadmap or are recorded as observations |
    | Module Decomposition | Module boundaries, responsibilities, ownership, and existing-vs-new module decisions are clear and non-overlapping |
    | Contract Readiness | Cross-module interfaces, shared schemas, protocols, fields, signatures, and error semantics are executable by feature-design |
    | Feature Slice Readiness | Each item can become an independent feature workflow with a clear outcome and scope |
    | Dependency / Minimal Loop | depends_on is a justified DAG; minimal_loop is unique and truly forms the narrowest end-to-end path |
    | Update Impact | Contract / scope / dependency changes account for planned, in-progress, done, and dropped items |

    ## Calibration

    Only flag blocking issues that would cause downstream feature-design to come
    back for clarification, produce incompatible interfaces, implement the wrong
    slice, violate requirements / architecture, or mis-handle dependency order.

    Do not flag optional enhancements, future ideas, product wishlist items, or
    style improvements. Put non-blocking discoveries in Advisory Notes only.

    ## Output Format

    ## Roadmap Review

    **Status:** Approved | Issues Found

    **Blocking Issues (if any):**
    - [Section / Source]: [specific issue]
      - Why it matters: [feature-design / contract / dependency / scope risk]
      - Required fix: [exact roadmap or items.yaml change needed]
      - Also update: [main doc / items.yaml / observations / changelog]

    **Advisory Notes (non-blocking):**
    - [optional observations or follow-ups]
```

**Reviewer returns:** Status, Blocking Issues, Advisory Notes.
