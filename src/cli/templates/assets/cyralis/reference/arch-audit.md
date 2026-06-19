# Arch / Audit Reference

## 1. Architecture work

`cs-arch` maintains the current-state map only.

Modes:

- `backfill`: write a doc for a module that already exists
- `update`: refresh an existing doc to match code
- `check`: compare docs and code, then report mismatches

Architecture docs should describe:

- current structure
- current interactions
- known constraints
- what the system already is

Do not write future plans into architecture docs.

## 2. Audit work

`cs-audit` scans for problems in a bounded scope.

Findings should include:

- location
- evidence
- severity
- confidence
- recommended next skill

Typical dimensions:

- bug
- security
- performance
- maintainability
- arch-drift

## 3. Arch review

`cs-arch-review` looks for deepening candidates:

- shallow module
- pass-through module
- missing locality
- seam leak
- test surface mismatch
- adapter distortion

Each candidate should answer:

- why this is architecture work and not just a bug or style issue
- what file / module / seam is involved
- what the likely next step is

## 4. Language

Use these words when discussing architecture:

- module
- interface
- seam
- adapter
- locality
- leverage
- depth
