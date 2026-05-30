# Cyralis

Cyralis is a host-neutral context and memory layer for coding agents.

Cyralis uses a Trellis-like install model: a global CLI writes project-local
host projections. The CLI does not own UI, TUI, model provider, shell runtime,
notification, or LSP behavior. It only installs `.cyralis/`, `.codex/`, `.pi/`,
and related project files.

```text
host agent
  -> host binding (.codex / .pi / future hosts)
  -> Cyralis runtime
       -> context layers
       -> recent turns
       -> recall hints
       -> markdown memory
```

## Install Model

```text
npm install -g cyralis
  -> cyralis init --pi --codex
  -> writes project-local .cyralis/.pi/.codex files
```

For local development:

```bash
npm install
npm run build
node bin/cyralis.mjs init --cwd /path/to/project
```

## Layout

```text
.cyralis/          host-neutral state, config, and memory root
.codex/            Codex project binding
.pi/               Pi project binding
bin/               global CLI entrypoint
src/cli/           installer implementation
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
