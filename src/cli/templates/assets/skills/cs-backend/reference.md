# cs-backend reference

## Owner Questions

Use these questions before editing backend code:

- What is the source of truth for this behavior?
- Is the proposed edit at the owner or at a caller / adapter / fallback?
- Does the change alter public contract, data contract, or persistence shape?
- Can the same bug class appear through another caller?
- Is there an old owner, fallback, compatibility path, or historical patch to retire?

## Contract Checklist

Backend contract is more than endpoint shape:

- Operation: what the caller is allowed to ask for
- Input: required fields, defaults, validation, normalization
- Output: success payload, error shape, partial result semantics
- Authn / authz: who may call it and under which scope
- Data isolation: tenant / user / organization / workspace / project boundaries
- Ordering: idempotency, retries, repeated events, concurrent writes
- Durability: persistence, cache, queue, migration and rollback expectations
- Observability: logs, metrics, traces, audit events, or project equivalent

## Test Selection

Prefer the narrowest command that proves the changed behavior:

- Domain invariant -> domain unit test or equivalent
- Application orchestration -> service / use-case integration test
- API mapping / auth -> API / request-level test
- Persistence / migration -> migration or repository integration test
- Job / event / webhook -> handler test with idempotency and retry cases

If a test would only assert framework behavior or duplicate a stronger integration test, do not add it just to have a test.

## Severity Guide

- P0: data leak, permission bypass, data corruption, broken migration, public contract break, irreversible side effect
- P1: wrong owner causing likely future drift, missing idempotency on retryable path, unverified transaction boundary, important error semantics missing
- P2: naming drift, thin evidence gap, local duplication, non-blocking observability gap

## Evidence Examples

Good evidence:

- `src/server/users/service.ts:84` enforces workspace id before repository call
- `npm test -- users.service.test.ts` passed and covers duplicate invite idempotency
- Manual reproduction: POST duplicate webhook twice, second call returns existing result and no duplicate row

Weak evidence:

- "Looks correct"
- "Typecheck passed" for behavior change
- "The frontend prevents it" for backend authorization
- "The test was updated" without explaining behavior coverage
