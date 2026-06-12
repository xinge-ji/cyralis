# Code Reuse Thinking

Use this reference before creating new code that may already exist in another form.

The goal is not to force abstraction. The goal is to prevent duplicate owners, copied contracts, repeated constants, and parallel implementations that drift.

---

## Trigger Signals

Read this reference when any signal appears:

- You are about to create a helper, utility, shared component, adapter, decoder, normalizer, projection, constant, or config field.
- You are copying code from another file.
- Similar logic appears in 2+ places, or this would be the third instance of a pattern.
- Multiple files read the same untyped payload field, event field, config field, status, action, or kind.
- A change requires similar edits across multiple platforms, hosts, generated templates, routes, or command variants.
- A reducer, switch, state transition, or dispatcher gains a new action / kind / status / phase.

---

## Search First

Before writing the new shape, search for:

- existing type / function / component names
- the field / constant / status / event kind being changed
- old terms and synonyms
- generated copies or host projections
- tests that assert the old behavior

Prefer `rg` when available:

```bash
rg "name_or_field_or_status"
rg "similar concept|synonym|old term"
```

If the repository has a project-specific code intelligence tool, use it according to the local `AGENTS.md` before editing symbols.

---

## Reuse Decision

Choose one:

| Decision | Use when |
|---|---|
| Reuse existing owner | A function / component / decoder / projection already owns the concept |
| Extend existing owner | The existing abstraction is correct but lacks one case |
| Extract shared owner | The same non-trivial logic is already duplicated or this would create the third copy |
| Keep local | The logic is trivial, one-off, and making it shared would create more surface than it removes |
| Stop and redesign | You cannot identify the owner, or two owners conflict |

Do not create a shared utility just because code looks similar. Create one only when it owns a real concept and reduces future drift.

---

## Duplication Patterns To Catch

### Copied Validation Or Normalization

Validation copied into UI, API, and persistence will drift. Pick the entry or contract owner and make other layers consume the normalized result.

### Similar Components Or Views

If a new component is mostly an existing component with different labels or small behavior, extend the existing owner or extract a narrow shared primitive. Do not create a parallel component family.

### Repeated Constants

Statuses, actions, event kinds, config keys, route names, template markers, and environment variable names should have one owner when used across files.

### Repeated Payload Field Extraction

If two consumers read the same raw event / JSON / config field with local casts or defensive checks, add a type guard, normalizer, or projection at the payload owner before adding another reader.

### Scattered Reducer Logic

When state is derived from `kind`, `action`, `status`, `phase`, or similar values, prefer one reducer / dispatcher table over scattered `if` branches.

---

## Batch Change Checklist

After making similar edits:

- [ ] Searched for missed instances.
- [ ] Updated generated host projections or templates that mirror the same concept.
- [ ] Updated tests for all entry points, not just the path first edited.
- [ ] Confirmed constants and payload fields still have one owner.
- [ ] Confirmed reducers / dispatchers handle the new action or status explicitly.
- [ ] Confirmed no new generic helper became a business-rule bucket.

---

## Minimal Output

When this reference is triggered, include a short note in the current implementation report, analysis, design, or acceptance report:

```markdown
Code Reuse Check:
- Search terms:
- Existing owners found:
- Decision: reuse | extend | extract | keep-local | stop
- Reason:
- Missed-instance check:
```

Keep it short. If the decision is `stop`, return to the current workflow's design or analysis step before editing.
