# xypes-identity Pilot Evidence Template

Use this template when recording a non-production auth rollout gate run.

This is the expected evidence shape for changes covered by `./STAGING_GATE.md` and the signal requirements in `./TELEMETRY_BASELINE.md`.

## Gate Run Summary

- change identifier:
- date:
- environment:
- gate owner:
- participating repos:
- rollout decision: `pass` | `pass with restrictions` | `fail`

## Scope Of Change

- affected endpoints or flows:
- affected repos:
- whether the change touches bridge behavior, decision semantics, cache invalidation, replay, or consumer integration:

## Environment Used

Confirm the gate environment included:

- engine HTTP service
- engine worker
- Redis
- Postgres
- Supabase-compatible JWT verification path or local JWKS equivalent
- representative user-facing consumer path
- representative backend-service consumer path

Notes:

- environment-specific caveats:
- known limitations accepted for this run:

## Validation Checks Run

Record the concrete checks executed:

- build commands:
- tests executed:
- cross-repo validation steps:
- contract-sensitive docs updated:

## Representative Pilot Flows Exercised

### User-Facing Flow

- application or path exercised:
- tenant selection shape used:
- allow flow evidence:
- deny flow evidence:
- observed `decision_id` trace reference:

### Backend-Service Flow

- service or path exercised:
- session resolution evidence:
- authorize-check evidence:
- privileged-write fail-closed evidence, if applicable:
- observed `decision_id` trace reference:

## Failure Modes Tested

Record at least one relevant exercised failure mode and its classification.

| Failure mode                           | Trigger method | Observed code or outcome | Classified as | Evidence reference |
| -------------------------------------- | -------------- | ------------------------ | ------------- | ------------------ |
| invalid token                          |                |                          |               |                    |
| expired token                          |                |                          |               |                    |
| tenant membership missing or suspended |                |                          |               |                    |
| explicit authorization deny            |                |                          |               |                    |
| JWKS or bridge degradation             |                |                          |               |                    |

## Observability Evidence

Record the minimum signal set relevant to the change.

### Decision Traceability

- request or trace reference:
- `decision_id` preserved in logs or diagnostics:

### Token Validation And Bridge Availability

- invalid or expired token visibility:
- JWKS or verification outage visibility:

### Authorization Latency

- path measured:
- observed latency view or trace reference:
- within target SLO: yes or no

### Cache Status Or Hit Ratio

- cache status evidence:
- hit or miss behavior observed:

### Invalidation Or Replay Latency

- mutation exercised:
- time to fresh decision or replay observation:
- page-worthy threshold used:

### Webhook Lag

- signal reference, if available:
- if unavailable, explicit note that this remains a gap:

## Recovery And Rollback Posture

- how to disable or narrow the change:
- tenant-disable or shadow-only fallback:
- restore or replay confirmation needed: yes or no
- related DR or replay evidence reference:

## Outcome

- final decision:
- restrictions, if any:
- unresolved gaps:
- follow-up actions:
- owner for follow-up:
- target date for the next gate run:

## Companion Documents

- `./STAGING_GATE.md`
- `./TELEMETRY_BASELINE.md`
- `./AUTH_FAILURE_RUNBOOK.md`
- `./DISASTER_RECOVERY_PLAN.md`
