# AI-Assisted Delivery Target State

This document records the stricter workflow the platform should move toward later.

It is intentionally separate from `./AI_ASSISTED_WORKFLOW.md` so the workspace does not confuse current team practice with already-enforced repository policy.

## Goal

Reach a delivery model where AI-assisted development remains fast, but merge safety and rollout safety are enforced by repository and operational rails rather than by discipline alone.

## Target State Summary

The target state is:

- boundary-aware agent usage
- short-lived feature branches
- small reviewable commits
- merge-blocking CI
- explicit contract validation
- required human review on sensitive paths
- staged rollout controls with telemetry evidence
- repeatable rollback posture

## Target Delivery Rails

### 1. Branch and PR governance

Add and enforce:

- branch naming conventions for feature, fix, and docs work
- protected main branches
- required pull requests for all non-trivial changes
- required reviewer count for protected areas
- status checks required before merge

### 2. CODEOWNERS and protected areas

Add CODEOWNERS coverage for at least:

- `xypes-identity-engine/src/**`
- `shared/src/**`
- `docs/EXECUTION_PLAN.md`
- `docs/STAGING_GATE.md`
- `docs/AUTH_FAILURE_RUNBOOK.md`
- `docs/TELEMETRY_BASELINE.md`

Sensitive path changes should require explicit human approval before merge.

### 3. Merge-blocking CI

Represent the delivery rails in repository automation.

Minimum target checks:

- build
- typecheck
- tests
- contract-sensitive checks
- static analysis
- dependency or security scanning

Where practical, run the same repo and cross-repo verify scripts already defined under `scripts/linux/` and `scripts/windows/`.

### 4. Explicit contract validation

Move from contract discipline by convention to contract discipline by enforced workflow.

Target outcomes:

- changed external endpoints must prove schema alignment in automated validation
- published API reference for core auth endpoints is generated from the same schema source used for validation
- contract-sensitive changes fail CI when schemas, docs, or consumer-facing references drift

This aligns with the backlog already described in `shared/ROADMAP.md`.

### 5. Security and dependency scanning

Add automated scanning for:

- vulnerable dependencies
- exposed credentials or tokens
- common static analysis findings on server and SDK code

This should become part of merge gating for protected branches.

### 6. Rollout controls represented in code and evidence

For rollout-facing auth changes, the target state should include implemented and testable controls for:

- shadow mode mismatch logging
- tenant-scoped enforcement controls
- representative pilot integrations
- repeatable pilot evidence capture
- operator-visible telemetry for required rollout signals

The intent already exists in:

- `docs/STAGING_GATE.md`
- `docs/TELEMETRY_BASELINE.md`
- `docs/PILOT_EVIDENCE_TEMPLATE.md`

The target state is to make those documents executable delivery rails rather than documentation-only guidance.

### 7. Cross-repo validation as a first-class workflow

For changes spanning engine, admin, sdk, shared, or representative consumers, the target state should require:

- dependency-order validation
- representative integration or smoke coverage
- explicit evidence that decision ids, deny behavior, and tenant context still propagate correctly

### 8. Periodic architectural hygiene

AI-assisted velocity can introduce slow architectural erosion even when each individual diff looks acceptable.

The target state should therefore include recurring review of:

- duplicated abstractions
- boundary violations
- local policy invention outside engine
- schema drift between repos
- rollout or operational docs that overstate completion

## Recommended Gap List

Before this target state can be considered active, the workspace should eventually add or confirm:

- `.github/workflows/` with merge-blocking checks
- `CODEOWNERS`
- published contract or API-reference generation for core auth endpoints
- explicit security scanning automation
- documented reviewer rules for engine and shared surfaces
- implemented rollout controls for shadow mode and tenant-scoped enforcement
- repeatable pilot evidence from representative consumers

## Adoption Rule

Until the above rails exist, treat this document as a planning reference only.

The operative document for current work is `./AI_ASSISTED_WORKFLOW.md`.
