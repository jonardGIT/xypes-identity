# xypes-identity Telemetry Baseline

Minimum identity and authorization telemetry required before pilot rollout widens.

This document defines:

- which signals are mandatory
- where those signals should come from
- what they are used to diagnose
- what still exists only as implementation intent versus current evidence

Use this with `./STAGING_GATE.md`, `./AUTH_FAILURE_RUNBOOK.md`, and `./DISASTER_RECOVERY_PLAN.md`.

## Purpose

The platform already has core authorization semantics, cache invalidation machinery, structured decision logging hooks, and OpenTelemetry decision-path hooks. The remaining rollout gap is not whether telemetry matters; it is whether the repo and non-production environments provide repeatable evidence for the signals operators need.

This baseline makes that minimum evidence explicit.

## Required Signal Set

The minimum rollout-facing signal set is:

1. token validation failures
2. JWKS and token-verification availability failures
3. authorization latency
4. decision cache hit ratio
5. invalidation and replay latency
6. webhook processing lag
7. decision traceability through `decision_id`

## Baseline Signals

| Signal                                      | Why it matters                                                                  | Expected source                                                                               | Current workspace evidence                                                                                                                                    | Pilot requirement                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| token validation failures                   | distinguishes bad caller input from outage or policy deny                       | bridge metrics, structured logs, or counters around `resolve-session`                         | deterministic error codes are documented and `resolve_session.result` structured logs now exist; durable metrics evidence is not yet represented              | measured and alertable                                 |
| JWKS and verification availability failures | detects upstream identity degradation before callers invent fallback behavior   | bridge metrics and logs for `AUTH_JWKS_UNAVAILABLE` and `AUTH_TOKEN_VERIFICATION_UNAVAILABLE` | deterministic error codes, runbook coverage, and `resolve_session.result` structured logs now exist; durable telemetry evidence is still missing              | measured and alertable                                 |
| authorization latency                       | shows whether the decision path remains inside rollout SLOs                     | OpenTelemetry spans and request latency views                                                 | decision-path OpenTelemetry hooks exist in engine                                                                                                             | visible in non-production and tied to rollout evidence |
| decision cache hit ratio                    | shows whether hot-path performance depends on cache behavior as expected        | cache metrics or span attributes aggregated into dashboards                                   | decision-path telemetry records cache hit or miss attributes on `authorize.check`                                                                             | aggregated ratio available during pilot                |
| invalidation and replay latency             | shows whether membership or binding changes propagate inside revocation targets | worker metrics, replay timing, or invalidation lag views                                      | outbox and cache-version mechanisms exist and the worker now emits structured batch-duration logs; durable end-to-end latency evidence is not yet represented | measured for mutation-to-freshness path                |
| webhook processing lag                      | shows whether upstream identity lifecycle changes are arriving fast enough      | webhook ingestion metrics or lag gauges                                                       | roadmap target only; a manual reconciliation scan and lifecycle counters now exist, but webhook lag evidence remains partial                                   | measured and page-worthy threshold defined             |
| `decision_id` propagation                   | lets operators correlate request, authorization, audit, and incident evidence   | structured logs, app logs, and pilot evidence                                                 | `decision_id` is already part of engine responses and consumer guidance                                                                                       | present in exercised pilot flows                       |

## Current Implementation Baseline

Current concrete evidence in the workspace includes:

- engine decision-path OpenTelemetry integration through `createOpenTelemetryAuthorizationTelemetry`
- authorization decision span attributes for tenant, principal, application, action, resource, outcome, reason code, matched-binding count, and cache status
- structured decision-log bindings carrying `decision_id`, outcome, reason code, and deny-policy reference
- structured `resolve_session.result` logs carrying tenant, subject when known, principal id when known, decision id on success, and deterministic error codes on failure
- structured outbox worker logs carrying claimed, published, failed, and batch-duration fields for replay processing visibility
- deterministic resolve-session outage error codes documented in the auth-failure runbook and consumer guidance

Current important limitation:

- the workspace does not yet provide a single repeatable non-production evidence set proving that token validation failures, JWKS availability failures, invalidation latency, and webhook lag are measured and reviewed as rollout gates rather than as implementation intent
- the engine now has a read-only reconciliation scan and lifecycle counters, but that still needs scheduled execution and operator-facing evidence before pilot expansion can depend on it

## Concrete Signal Expectations

### 1. Token Validation Failures

Must answer:

- are callers sending malformed or expired tokens?
- is the problem isolated to one tenant or application?
- is the failure rate transient or sustained?

Minimum dimensions:

- environment
- issuer
- tenant when known
- application when known
- failure code

Important split:

- invalid token and expired token are not outage signals
- JWKS and verification unavailability are outage signals, not caller mistakes

### 2. Authorization Latency

Must answer:

- are allow and deny paths staying inside the initial SLO targets?
- are cache misses or replay windows pushing latency outside acceptable bounds?

Minimum dimensions:

- application id
- action
- outcome
- cache status

Initial targets remain those in `./EXECUTION_PLAN.md`.

### 3. Decision Cache Hit Ratio

Must answer:

- is the hot path behaving like a cache-backed path or a repeated cold evaluation path?
- did a rollout or invalidation change unexpectedly collapse cache effectiveness?

Minimum dimensions:

- tenant id when feasible
- application id
- action
- cache status

### 4. Invalidation And Replay Latency

Must answer:

- how long after a binding, membership, deny-policy, or suspension change does the fresh decision path reflect the new state?
- is replay lag making revocation risk unacceptable?

Minimum evidence:

- at least one measured mutation-to-freshness path in non-production
- explicit operator notes for what constitutes a page-worthy delay

### 5. Webhook Processing Lag

Must answer:

- are upstream identity lifecycle changes arriving within the operational window?
- when lag exceeds the target, do operators know whether reconciliation must compensate?

Current state:

- webhook lag remains a rollout requirement rather than a demonstrated workspace capability
- reconciliation is now partially evidenced through the engine operations scan and lifecycle counters, but it is not yet a complete lifecycle-sync story without webhook ingestion and measured lag

### 6. Decision Traceability

Must answer:

- can an operator go from a failing request to the engine decision and related audit or pilot evidence?

Minimum evidence:

- `decision_id` preserved in consumer logs or diagnostics for exercised protected flows
- decision path linked to request or trace context in non-production evidence

## Page-Worthy Conditions

Before widening rollout, define at least these alert-worthy conditions:

- sustained spike in `AUTH_JWKS_UNAVAILABLE` or `AUTH_TOKEN_VERIFICATION_UNAVAILABLE`
- authorization latency outside the initial SLO window for a sustained period
- invalidation or replay latency beyond the revocation target
- webhook lag beyond the declared operational window
- inability to correlate pilot failures through `decision_id`

The exact numeric thresholds can evolve, but they must exist before pilot expansion depends on them.

## Minimum Non-Production Evidence

For a rollout-facing auth change, the evidence record should include:

- one allow flow with `decision_id` preserved
- one deny flow with `decision_id` preserved
- one token or tenant-access failure classified correctly
- one outage-adjacent failure when the change affects bridge or verification behavior
- authorization latency visibility for the exercised path
- cache-status visibility for the exercised authorization path when cache behavior is relevant

This evidence is required by `./STAGING_GATE.md` for a full pass.

Use `./PILOT_EVIDENCE_TEMPLATE.md` to capture this evidence in a repeatable format.

## Current Gap Summary

Documented and partially implemented now:

- decision-path tracing hooks
- structured decision logs
- deterministic auth-failure taxonomy
- rollout docs that require observability evidence

Still missing or partial:

- durable non-production dashboards or evidence for token validation failure rates
- repeatable invalidation and replay latency evidence
- webhook lag evidence
- scheduled reconciliation evidence and operator-facing anomaly review flow
- admin-side operator views that surface these signals directly

## Companion Documents

- `./EXECUTION_PLAN.md`
- `./STAGING_GATE.md`
- `./PILOT_EVIDENCE_TEMPLATE.md`
- `./AUTH_FAILURE_RUNBOOK.md`
- `./AUTH_THREAT_MODEL.md`
- `../shared/ARCHITECTURE.md`
