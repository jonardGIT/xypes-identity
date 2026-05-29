## Summary

Describe the bounded change slice and the repo boundary it belongs to.

## Ownership Boundary

- [ ] `xypes-identity-engine`
- [ ] `xypes-identity-admin`
- [ ] `xypes-identity-sdk`
- [ ] `shared`
- [ ] bounded cross-repo change
- [ ] no sibling `xypes-docman` files changed

## What Changed

- [ ] one endpoint or route slice
- [ ] one service behavior or semantics slice
- [ ] one SDK or middleware slice
- [ ] one admin shaping or governance slice
- [ ] one refactor
- [ ] one docs update

If cross-repo, explain the sequence and why it was necessary.

## Validation

- [ ] reviewed generated diff before widening scope
- [ ] ran narrow repo validation
- [ ] ran cross-repo validation when contracts or integrations changed

Validation commands run:

```text
paste commands here
```

## Contract And Rollout Checks

- [ ] no external contract changed
- [ ] shared or endpoint contract changed and related docs were updated
- [ ] rollout-facing auth behavior was unchanged
- [ ] rollout-facing auth behavior changed and was checked against staging, telemetry, and failure-mode docs

Relevant docs reviewed or updated:

- [ ] docs/EXECUTION_PLAN.md
- [ ] docs/STAGING_GATE.md
- [ ] docs/TELEMETRY_BASELINE.md
- [ ] docs/AUTH_FAILURE_RUNBOOK.md
- [ ] docs/PILOT_EVIDENCE_TEMPLATE.md
- [ ] shared/ARCHITECTURE.md
- [ ] docs/AI_ASSISTED_WORKFLOW.md

## Review Notes

Call out anything that still requires human attention, especially around:

- authorization semantics
- shared contracts
- session resolution
- audit event shape
- cache invalidation or replay behavior
- rollout-facing degraded-mode handling

If any sibling `xypes-docman` files changed, explain why that consumer-side change was intentionally in scope.
