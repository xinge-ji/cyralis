# Cyralis Memory

Use this skill when working on Cyralis context or memory behavior.

Follow the repository boundary:

- `src/core` owns context assembly and recall lifecycle.
- `src/memory` owns persistence and retrieval.
- `src/host-bindings` owns host event adaptation.
- `.cyralis` is host-neutral state.
- `.codex` and `.pi` are host projections.

