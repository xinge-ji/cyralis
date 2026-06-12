# cs-ui reference

## Owner Questions

Use these before editing UI code:

- What user-visible state is wrong or missing?
- Who owns that state: route, page, component, hook, store, API adapter, or schema?
- Is this server state, client state, form state, or derived display state?
- Is the proposed fix at the owner, or just a presentation guard?
- Does the UI rule duplicate a backend authorization or data-boundary rule?

## State Checklist

Only include states relevant to the feature:

- loading: what is visible before data resolves
- empty: what is visible when the valid result has no items
- error: what is visible, recoverable, and actionable
- permission: what blocked users see and cannot do
- disabled: what is disabled, why, and how it recovers
- dirty / saving: how unsaved or in-flight changes are represented
- success: what confirms the action completed
- optimistic / rollback: if used, how the UI recovers from failure

## Test Selection

Prefer tests that prove user-observable behavior:

- Pure transform / schema / hook branch -> unit or hook test
- Component local state machine -> component test
- API mapping / cache invalidation -> integration test with mocked transport
- Full user journey / routing / cross-screen behavior -> manual browser path or E2E candidate

Avoid tests that only assert:

- framework rendering basics
- CSS class names or DOM shape without user contract
- component library defaults
- callbacks that only forward unchanged props
- static text that is already covered by a stronger journey test

## Manual Evidence Template

```text
Manual UI Evidence:
- Route / screen:
- Preconditions:
- Steps:
- Expected:
- Observed:
- Evidence artifact: screenshot path | screen recording path | none
- Gaps:
```

## Severity Guide

- P0: user cannot complete primary path, destructive action wrong, permission leak, data from wrong scope displayed
- P1: important state missing, form accepts invalid user input without recovery, cache shows stale cross-scope data, keyboard/focus blocks core path
- P2: minor copy / empty-state gap, weak test evidence, small responsive issue outside primary viewport

## Evidence Examples

Good evidence:

- `src/routes/settings.tsx:142` blocks submit while mutation is pending
- `npm test -- settings-form.test.tsx` covers server validation mapping
- Browser path `/settings -> Save invalid email -> inline error shown, focus remains in form`

Weak evidence:

- "Typecheck passed" for interaction behavior
- "The backend rejects it" for missing UI recovery
- "Looks fine" without route, state, or steps
- Screenshot of a static page when the risk is interaction or cache behavior
