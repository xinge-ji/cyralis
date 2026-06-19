# Shared Reference

## 1. Compound archive

Learning / trick / decision / explore live in `.cyralis/compound/`.

- `learning`: pitfall or knowledge
- `trick`: pattern / library / technique
- `decision`: tech-stack / architecture / constraint / convention
- `explore`: question / module-overview / spike

Shared rules:

- only archive verified or confirmed material
- update existing docs when the conclusion has not changed
- supersede / mark outdated when the conclusion is replaced
- run `cyralis memory sync` after write / update / supersede

## 2. Completion and review

When a workflow finishes, write the report artifact first, then ask about commit.

- keep the commit scoped to the current workflow artifacts + code
- do not merge unrelated fixes into the same completion record
- if the user says "不用", stop asking
- suggested closeout order: `cs-learn`, `cs-decide`, `cs-guide` or `cs-libdoc`, then `scoped-commit`

## 3. Decision hygiene

Use when multiple options, owner confusion, fallback growth, or legacy shape makes the right choice unclear.

- state the current owner
- state what changes in the name / shape / topology if another option is chosen
- separate facts, assumptions, and user decisions
- do not hide a choice behind implementation detail

## 4. Cross-layer thinking

Use when a change crosses payload / event / config / schema / generated template / runtime parser / API boundary.

- identify canonical owner
- identify downstream consumers
- write the boundary and the compatibility / retirement rule
- do not let callers re-parse or reinterpret normalized data

## 5. Code reuse thinking

Use when adding helper / adapter / decoder / normalizer / projection / constant / shared component / utility.

- search for existing equivalents first
- prefer one owner and one source of truth
- if the same logic appears twice, stop and decide whether it belongs in a shared layer
- do not create a generic bucket for one-off code

## 6. Implementation reflection

Common stop signals during coding:

- a file or class keeps growing
- a helper bucket starts collecting unrelated responsibilities
- a patch branch appears just to handle one special case
- the same logic is being copied to a second place
- a new concept name conflicts with an existing one

If the fix needs structural change outside the current workflow boundary, record it as follow-up work instead of forcing it in.
