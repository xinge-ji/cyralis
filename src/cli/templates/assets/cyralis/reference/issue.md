# Issue Reference

## 1. Report

Capture symptoms only.

Frontmatter:

```yaml
---
doc_type: issue-report
issue: 2026-05-31-example-issue
status: draft
severity: P0
summary: 界面点击后空白
tags: []
---
```

Required sections:

- problem phenomenon
- reproduction steps
- expected vs actual
- environment info
- severity

## 2. Analysis

Read code, find the failing path, then explain the root cause.

Must include:

- diagnostic stop layer
- canonical owner
- patch-shape / minimality signals
- same-pattern search
- impact assessment
- 2-3 repair options

## 3. Fix gates

Before marking done, record:

- reproduction before
- verification after
- canonical owner
- same-pattern search
- H-class signals
- repair track
- retirement track
- confidence

Confidence must be at least `B` to claim a full fix.

## 4. Debugging principles

Start with evidence, then move up the failure stack:

```text
symptom / error -> repro signal -> recent change -> data flow / call chain -> diagnosis layer -> canonical owner -> minimal sufficient repair -> verification -> repair / retirement
```

Minimal sufficient repair means:

- repair at the canonical owner
- fix the bug class, not only the sample
- do not add unbounded fallback / branch / adapter
- keep or retire old owner / fallback / historical patch with a reason

### Diagnosis layers

| Layer | Question |
|---|---|
| L1 Symptom | What failed, where, and is it reproducible? |
| L2 Logic | Which branch, state transition, or invariant is wrong? |
| L3 System | Which component boundary or ownership handoff failed? |
| L4 Architecture | Which design choice, duplicate owner, or fallback chain caused it? |
| L5 Cross-system Contract | Which API / data / timing / SLA contract does not hold? |
| L6 Platform | Which runtime / OS / framework / host constraint caused it? |
| L7 Spec Gap | Who never defined the correct behavior for this case? |

If the stop layer affects fix boundary, contract owner, user semantics, or requires user judgment, write a short `Layer Stop Card` in analysis:

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

## 5. Quick lane

Use only when the bug is low risk, single owner, and obvious from code:

- reproducible signal exists
- file:line and actual cause are clear
- change is small and local
- no shared / core / cross-module / contract / fallback / adapter risk

## 6. Patch-shape triage

Warning signs, not proof:

- keyword / phrase / regex / sample-text exception
- local guard / extra conditional / try-catch / early return / one-off branch
- fallback / adapter / compatibility branch / legacy path expansion
- caller / consumer / presentation-layer patch
- downstream re-parse when upstream already has normalized state
- artifact / cache symptom patch without producer owner
- duplicate parsing / duplicate owner / keep both paths
- only fixing the sample, not the bug class

If the tempting fix is only a guard / fallback, add a minimality check:

```text
Minimality Check:
- Smallest textual diff:
- Correct owner:
- Bug class fixed:
- New branch/fallback added:
- Old path retired or scheduled:
- Verdict: sufficient repair | local patch | needs decision-hygiene review
```

`local patch` can only be mitigation unless it lives at the canonical owner and has a retention reason plus retirement trigger.

If the owner is still unclear, go back to `cs-issue-analyze` and read `.cyralis/reference/shared.md` for decision hygiene.
