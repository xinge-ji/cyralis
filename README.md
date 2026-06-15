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

Context is assembled as stable host-neutral layers:

```text
[system_core]      stable Cyralis behavior supplied by the active host projection
[injections]       explicit external context snippets
[session_identity] cwd, memory root, and session identity
[project_context]  .cyralis project helper paths
[recent_chat]      rolling Cyralis turn projection
```

Codex and Pi receive those layers through different delivery channels. Pi can
receive a runtime `systemPrompt`, so Cyralis renders system core plus dynamic
context through the Pi extension. Codex project hooks are additive user context,
so the Codex hook emits only dynamic facts such as session identity, project
context, workflow state, and recall hints; stable rules live in the generated
Codex agent/skill projection.

## Install Model

```text
npm install -g --install-links=true github:xinge-ji/cyralis
  -> cyralis init --pi --codex --force
  -> writes project-local .cyralis/.pi/.codex files
```

For local development:

```bash
npm install
npm run build
node bin/cyralis.mjs init --cwd /path/to/project
node bin/cyralis.mjs memory sync --cwd /path/to/project
```

## Memory Projections

Long-lived project documents stay in their source locations. Architecture docs
live under `.cyralis/architecture/`; learning, trick, decision, and explore docs
live under `.cyralis/compound/`. Cyralis can generate lightweight recall stubs
under `.cyralis/memory/projections/`:

```bash
cyralis memory sync --kind architecture
cyralis memory sync --kind compound --source .cyralis/compound/YYYY-MM-DD-learning-example.md
```

Those stubs are generated recall entry points, not source of truth. Default
project context includes only project helper paths, not architecture or compound
document bodies; relevant source docs should appear through recall hints or
explicit search/read.

Host projections use those stubs for lightweight per-turn recall. When a user
prompt overlaps an architecture or compound projection, Cyralis injects a compact
`[recall]` hint with the projection id, name, description, and source document
path. The full source markdown is still opened explicitly only when the task
needs the details.

For Pi debugging, set `CYRALIS_PI_DUMP_PROVIDER_REQUEST` to inspect the final
provider payload in `before_provider_request`:

```bash
CYRALIS_PI_DUMP_PROVIDER_REQUEST=stderr pi
CYRALIS_PI_DUMP_PROVIDER_REQUEST=.cyralis/runtime/debug/provider-payload.json pi
```

This prints or writes the payload and returns it unchanged; it does not cancel
the provider request.

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
