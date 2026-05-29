# xypes-identity Staging Gate

## Purpose

This document defines the non-production gate that rollout-facing auth changes must pass before pilot scope widens or enforcement posture becomes stricter.

It turns the execution-plan rollout language into a concrete checklist with required evidence.

## When The Gate Applies

Run this gate for changes that affect:

- `POST /v1/auth/resolve-session`
- `POST /v1/authorize/check`
- `POST /v1/authorize/explain`
- authorization semantics, scope rules, deny precedence, or suspension behavior
- SDK middleware or request-shaping guidance used by consumer applications
- cache invalidation, outbox replay, or rollout-facing degraded-mode behavior

## Gate Outcome Types

- pass: change is eligible for non-production pilot rollout
- pass with restrictions: change may run only in shadow mode or limited tenant scope
- fail: change must not widen pilot or enforcement posture

## Required Non-Production Environment

The gate must run in a repeatable non-production environment that includes:

- engine HTTP service
- engine worker
- Redis
- Postgres with representative authorization state
- Supabase-compatible JWT verification path or equivalent local JWKS-backed identity bridge
- at least one representative user-facing consumer path
- at least one representative backend-service consumer path

The environment does not need production scale, but it must preserve the real trust boundaries between caller, bridge, engine, Postgres, Redis, and SDK-backed consumers.

## Representative Pilot Integrations

The minimum pilot set is:

1. one user-facing app shape
2. one backend-service shape

### Current baseline user-facing shape

- `xypes-docman-web` from the sibling docman workspace as the user-facing surface
- `xypes-docman-api` from the sibling docman workspace as the backend that resolves session and calls authorization

This path proves that browser-originated traffic can preserve explicit tenant context, avoid local authorization, and carry the engine `decision_id` through backend enforcement and operator-visible diagnostics.

### Current baseline backend-service shape

- `xypes-docman-api` from the sibling docman workspace as the current backend-service representative

This path proves that a backend process can use the SDK-backed identity and authorization path without relying on a browser session boundary.

Current limitation:

- the workspace does not yet show a second independent backend consumer beyond docman, so the backend-service representative is documented but still narrow. Widening pilot scope should prefer adding another direct consumer when practical.

## Gate Checklist

All items below must be evidenced for a full pass.

### 1. Contract and schema checks

- boundary schemas for `resolve-session`, `authorize.check`, and `authorize.explain` remain aligned with implementation
- contract-sensitive changes have updated docs and integration guidance where needed
- deterministic error behavior remains documented for token, tenant-access, deny, and outage-adjacent paths

### 2. Repo-scoped validation

- changed repos build successfully
- changed repos pass their narrow tests
- rollout-facing auth changes use the cross-repo validation path when the change spans engine, sdk, admin, or consumer integration behavior

### 3. User-facing pilot flow

The representative user-facing path must prove:

- bearer token forwarding stays intact
- tenant context remains explicit
- backend enforcement calls xypes-identity rather than local heuristics
- deny paths preserve `decision_id` and operator-debuggable context

### 4. Backend-service pilot flow

The representative backend path must prove:

- session resolution and `authorize.check` complete successfully in a non-browser flow
- service-side code does not infer authorization from JWT claims
- privileged writes fail closed when identity freshness cannot be established

### 5. Observability evidence

For the exercised flows, capture evidence for:

- `decision_id` propagation
- token-validation failures or success visibility
- authorization latency visibility
- cache invalidation or replay visibility when the change touches those surfaces

Use `docs/TELEMETRY_BASELINE.md` as the minimum required signal set and evidence standard for this section.

### 6. Failure-mode exercise

At least one relevant failure mode must be exercised and classified using `docs/AUTH_FAILURE_RUNBOOK.md`:

- invalid token
- expired token
- tenant membership missing or suspended
- explicit authorization deny
- JWKS or bridge degradation when that path is affected by the change

### 7. Recovery and rollback posture

- operator notes identify how to disable or narrow the change if pilot behavior is wrong
- changes that affect restore, replay, or invalidation behavior include confirmation against `docs/DISASTER_RECOVERY_PLAN.md`

## Promotion Rules

### To enter shadow mode

Require:

- checklist items 1 through 5 completed
- at least one representative user-facing or backend-service flow exercised end to end
- no unresolved ambiguity between deny and outage classification

### To enter enforcement mode for a tenant

Require:

- full checklist completion
- both representative pilot shapes exercised
- no unexplained contract mismatch, replay issue, or cache-staleness risk
- a rollback or tenant-disable path identified before widening enforcement

### To widen beyond the initial pilot

Require:

- repeated gate passes over a stable window
- measured telemetry rather than one-off spot checks
- no outstanding auth-failure classifications that still require operator guesswork

## Required Evidence Record

Each gate run should record:

- change identifier or PR reference
- environment used
- repos and checks executed
- representative pilot flows exercised
- observed `decision_id` traces or equivalent references
- failure modes tested
- rollout decision: pass, pass with restrictions, or fail
- follow-up actions if anything remains limited or manual

Use `docs/PILOT_EVIDENCE_TEMPLATE.md` as the default record shape for this evidence.

## What Does Not Count As Passing

- only reading code or docs without running any representative flow
- only a local happy-path allow case
- only a diff review
- only a unit test in one repo when the change crosses repo boundaries
- manual operator confidence without recorded evidence

## Companion Documents

- `docs/AUTH_THREAT_MODEL.md`
- `docs/AUTH_FAILURE_RUNBOOK.md`
- `docs/DISASTER_RECOVERY_PLAN.md`
- `docs/EXECUTION_PLAN.md`
