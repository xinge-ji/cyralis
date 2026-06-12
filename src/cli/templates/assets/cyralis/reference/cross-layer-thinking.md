# Cross-Layer Thinking

Use this reference when a feature, bug fix, or refactor moves data or behavior across more than one owner.

The goal is not to create a heavyweight design step. The goal is to stop before coding and name the contracts that would otherwise be guessed locally in each layer.

---

## Trigger Signals

Read this reference when any signal appears:

- A change touches 2+ layers, such as UI -> API client -> service -> persistence.
- A payload, event, config field, command argument, API response, cache record, or stored shape changes.
- Multiple consumers read or derive the same data.
- You are not sure whether logic belongs in UI, API adapter, application service, domain, persistence, or a shared projection.
- A fix is tempting at a caller, display component, local guard, fallback, or adapter instead of at the source of truth.
- A generated host projection, template, runtime hook, parser, or workflow document must stay compatible across install/update paths.

---

## Map The Flow

Write a short flow before editing:

```text
Source -> Normalize -> Store -> Retrieve -> Project -> Display / Execute
```

For each arrow, answer:

- What shape crosses the boundary?
- Who owns validation and normalization?
- What errors can occur here?
- Is the value trusted internal data, user input, external input, or generated artifact?
- Which owner should expose the typed projection used by downstream code?

If the flow cannot be mapped in a few lines, the implementation plan is not ready. Return to the current workflow's design or analysis step.

---

## Boundary Checklist

For each boundary touched by the change:

- [ ] Input shape is explicit.
- [ ] Output shape is explicit.
- [ ] Error / missing / invalid cases are explicit.
- [ ] Validation happens at one owner, not scattered across consumers.
- [ ] Downstream code consumes typed values, projections, or normalized records.
- [ ] Display / command code does not redefine raw payload semantics.
- [ ] Derived state points back to the source identifier, such as `id`, `seq`, `version`, or equivalent.
- [ ] Tests or manual evidence cover a boundary failure, not only the happy path.

---

## Common Failure Patterns

### Implicit Format Assumptions

The UI assumes a date, enum, status, path, or error shape without checking the producer. Fix by making the boundary mapping explicit at the API / adapter / projection owner.

### Scattered Validation

Several layers validate or coerce the same field differently. Fix by choosing a canonical owner and making other layers consume that owner.

### Leaky Abstractions

A component knows persistence shape, a command parses raw event JSON, or a service depends on transport-only details. Fix by moving the contract to the nearest stable boundary.

### Repeated Raw Payload Parsing

Two or more consumers cast or parse the same untyped payload locally. Fix by adding one decoder, type guard, normalizer, or projection at the data owner.

### Runtime Template Drift

A generated file is both documentation and runtime input. Fix by checking fresh install, update / migration, and every parser that reads the generated shape.

---

## Minimal Output

When this reference is triggered, include a short note in the current design, implementation report, analysis, or acceptance report:

```markdown
Cross-Layer Check:
- Flow:
- Boundary owners:
- Contract changed: yes | no
- Validation owner:
- Downstream consumers checked:
- Evidence:
```

Keep it short. If the note grows large, the work probably needs a design update or a separate refactor.
