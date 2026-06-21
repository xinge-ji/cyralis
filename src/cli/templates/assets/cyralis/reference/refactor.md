# Refactor Reference

## 1. Refactor scan

Only scan within the user-approved scope.

Stop and route away when the pre-check fails:

- the request is not behavior-preserving
- the scope is too large
- the target is actually bug fix / feature / architecture work
- there is no meaningful refactor candidate

## 2. Scan checklist

Record the candidate, the file pressure, the risk, and the suggested follow-up.

Keep checklist entries at the pattern level, not file-line level.

## 3. Refactor design

The design stage chooses:

- order of execution
- what is verified by AI
- what needs human validation
- rollback boundary

## 4. Apply

Apply one step at a time.

- do not batch steps
- do not mix behavior changes with structure-only moves
- keep the work reversible
- if a new structural need appears, stop and renegotiate

## 5. Methods

Use the local method library as the pattern vocabulary:

- parallel change
- extract / split
- strangler / replace
- file / directory reorganization

## 6. Methods library

Common scan methods:

| ID | Method | Use when |
|---|---|---|
| M-L1-01 | Parallel Change | Public interface must change without breaking callers |
| M-L1-02 | Strangler / Replace | New path should gradually replace old path |
| M-L2-01 | Extract / Split | One file or function does too much |
| M-L2-02 | Extract Helper | Repeated local logic should get a narrow owner |
| M-L3-01 | File Reorganization | Boundaries are already right but the tree is not |
| M-L3-02 | Directory Reorganization | Multiple files belong to one conceptual area |
| M-L4-01 | Performance Locality | Repeated work or hot path pressure needs structural cleanup |

## 7. Checklist format

Each scan item should include:

- candidate
- file pressure
- risk
- suggested follow-up

Keep checklist entries at pattern level, not file-line level.
