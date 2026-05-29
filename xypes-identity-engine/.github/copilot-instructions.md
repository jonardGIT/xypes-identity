# Copilot Instructions: xypes-identity-engine

You are working inside the authorization core of the xypes-identity platform.

## Read first

- `./.github/agent-context.json`
- `../docs/DESIGN_GUIDELINES.md`
- `../docs/EXECUTION_PLAN.md`
- `../docs/AI_ASSISTED_WORKFLOW.md`
- `../CONTRIBUTING.md`
- `../shared/ARCHITECTURE.md`
- `../shared/ROADMAP.md`

## Mission

This repo owns authorization. It is the source of truth for:

- authorization semantics
- tenancy model
- scope hierarchy
- deny precedence
- decision contract
- audit shape

## Non-negotiables

1. Tenant id is required in every authorization input. Never infer it from the principal alone.
2. Deny always overrides allow at the same or broader scope.
3. Nested group traversal is bounded. Default depth: 16.
4. Cycles in nested groups are rejected at write time.
5. Every mutation writes to the audit outbox in the same transaction.
6. JWT claims are identity context only. Never treat them as authorization.
7. The hot decision path must not call the admin API.

## Code conventions

- TypeScript strict mode.
- No `any` in authorization logic.
- Route handlers are thin. Business logic lives in services.
- Public exports use shared types from `../shared/types`.
- Use Fastify schemas for every external endpoint. Validate at the boundary.
- Use Pino logs. Every decision response carries a `decision_id`.

## API conventions

- All endpoints under `/v1/`.
- Decision endpoint returns `{ outcome, decision_id, reason_code, matched_bindings, deny_source? }`.
- Mutation endpoints return new state plus an audit reference.
- Error responses use deterministic error codes, not opaque 500s.

## Caching

- Two caches: decision cache and expansion cache.
- Cache keys include tenant id, application id, principal id, action, resource type, and resource id where relevant.
- TTL is a backstop only. Invalidation is driven by outbox events.

## Testing

- Every authorization rule has a semantics test.
- Every deny rule has an explicit test proving it overrides allow.
- Every cache invalidation path has a test proving bounded staleness.
- Every external endpoint has a contract test.

## Workflow expectations

- Keep each agent session to one bounded change slice unless a shared contract or authorization behavior requires an explicit cross-repo sequence.
- Stay inside `xypes-identity-engine/`, `shared/`, `docs/`, or root identity workflow files unless the task explicitly includes other repos.
- Do not edit sibling `xypes-docman` workspace files unless consumer-side work is explicitly in scope.
- Review generated diffs before widening scope and run the narrowest repo validation before broader checks.
- Treat branch naming, human review, and rollout checks as required team practice even when not repo-enforced.

## When to escalate to the platform orchestrator

- Any change to shared contracts under `../shared/`.
- Any change to authorization semantics that other repos must adapt to.
- Any change to the decision response shape.
- Any change to audit event shape.

## When to refuse a change

- Anything that lets admin or SDK bypass authorization.
- Anything that embeds effective permissions into JWTs.
- Anything that removes tenant context from authorization inputs.
- Anything that adds deny as a flag on a role instead of as a policy.
