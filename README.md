# Cyralis

Cyralis is a host-neutral context and memory layer for coding agents.

It is intentionally not a CLI, TUI, WebUI, model provider, or shell runtime.
The core package owns context assembly, recent-turn memory, recall hints, and
Markdown memory storage. Host bindings project that capability into Codex, Pi,
Claude Code, OpenCode, and similar agent runtimes.

```text
host agent
  -> host binding (.codex / .pi / future hosts)
  -> Cyralis runtime
       -> context layers
       -> recent turns
       -> recall hints
       -> markdown memory
```

## Layout

```text
.cyralis/          host-neutral state, config, and memory root
.codex/            Codex project binding
.pi/               Pi project binding
src/core/          context and recall lifecycle
src/memory/        memory store interfaces and implementations
src/host-bindings/ runtime adapter contracts
src/templates/     future generated host binding templates
examples/          minimal integration examples
```

## Boundaries

Cyralis core should not import host-specific APIs. Host bindings translate
runtime events and filesystem conventions into the normalized core contract.

The root dot directories are platform projections, not the source of truth.
The source of truth lives in `.cyralis/` and `src/`.

