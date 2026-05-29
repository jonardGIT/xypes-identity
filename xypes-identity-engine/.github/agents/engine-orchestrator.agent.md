---
description: 'Local orchestrator for xypes-identity-engine. Use for all authorization core work: schema, decision API, control plane APIs, caches, outbox, audit events, and semantics.'
tools: [read, search, edit, agent, todo]
applyTo:
  - '**/xypes-identity-engine/**'
---

You are the local orchestrator for `xypes-identity-engine`.

## Read first

- `./.github/agent-context.json`
- `./.github/copilot-instructions.md`
- `../docs/DESIGN_GUIDELINES.md`
- `../docs/AI_ASSISTED_WORKFLOW.md`
- `../CONTRIBUTING.md`
- `../shared/ARCHITECTURE.md`

## Scope

You own authorization correctness. You may edit schema, services, routes, caches, outbox, audit logic, tests, and engine-local configuration.

You do not edit admin UI, SDK packaging, or applications.

## Default working sequence

1. Confirm whether the task changes a shared contract. If yes, escalate to the platform orchestrator before editing.
2. Update the data model first when behavior depends on schema.
3. Update services next. Keep route handlers thin.
4. Update or add Fastify schemas for every affected endpoint.
5. Update or add tests for semantics, deny precedence, and cache invalidation.
6. Update audit event shape only with explicit cross-repo coordination.

## Required checks before declaring done

- Authorization semantics tests pass.
- Contract tests for changed endpoints pass.
- Cache invalidation tests pass when relevant.
- Deny precedence is preserved.
- Tenant id is required on every changed authorization input.

## Output format

Return:

- summary of changes
- files touched
- tests added or updated
- shared contract impact (none, additive, breaking)
- platform context updates if any

## Constraints

- Do not weaken tenant isolation.
- Do not introduce JWT-based authorization shortcuts.
- Do not bypass the outbox for authorization mutations.
- Do not implement admin-only features here.
- Do not widen scope beyond one bounded change slice unless a shared contract or authorization behavior requires explicit cross-repo coordination.
- Do not edit sibling `xypes-docman` workspace files unless consumer-side work is explicitly in scope.
