# Cyralis Agent Instructions

Cyralis is a pure context and memory project. Do not add UI, TUI, CLI, model
provider routing, shell runtime, notification, or LSP behavior unless the user
explicitly changes the product boundary.

## Architecture

Use this responsibility split:

```text
.cyralis/        host-neutral state and memory
.codex/.pi       host-discoverable projections
src/core         context assembly and recall lifecycle
src/memory       memory persistence and retrieval
src/host-bindings host event adapters
```

Core code must not depend on Codex, Pi, Claude Code, or OpenCode packages.
Adapters may depend on host event shapes, but should convert them into stable
Cyralis types before calling core runtime APIs.

Keep host-specific files small and generated-template-friendly.

