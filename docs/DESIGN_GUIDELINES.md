# xypes-identity Design Guidelines

These guidelines apply to all roots in this workspace. Per-repo `.github/copilot-instructions.md` files reference this document.

## 1. Architectural Boundaries

- Identity belongs to Supabase. Authorization belongs to xypes-identity.
- The control plane (admin APIs) and the data plane (decision APIs) must not share request handlers.
- The SDK never embeds business policy. It only calls the engine and exposes typed results.
- Shared contracts live in `shared/`. No service may define a duplicate of a shared type.

## 2. API Design

- Every external endpoint must have a JSON Schema for request and response.
- Endpoints are versioned under `/v1/`.
- Mutations return the new state plus an audit reference.
- Decision endpoints return `decision_id`, `outcome`, and `reason_code`.
- No endpoint may infer tenant context. The caller must declare it.
- Avoid catch-all endpoints. Prefer narrow, named operations.

## 3. Authorization Semantics

- Deny always overrides allow at the same or broader scope.
- Nested group traversal must be bounded. Default depth limit: 16.
- Cycles must be rejected at write time, not discovered at evaluation time.
- Bindings must always specify scope: `platform`, `tenant`, `application`, or `resource`.
- Role names are namespaced by application id. Avoid global role names.
- Effective access expansion is for admin and debugging, not for hot path enforcement.

## 4. Data Model Rules

- Every mutable table includes `created_at`, `updated_at`, `created_by`, `updated_by`.
- Authorization mutations write to the audit outbox in the same transaction as the change.
- Soft deletes only for entities used in audit chains. Hard deletes only for transient cache state.
- Tenant id is required on every multi-tenant table and is part of every relevant index.

## 5. Caching

- Two caches only: decision cache and expansion cache.
- Cache keys must include tenant id, application id, principal id, action, resource type, and resource id where relevant.
- TTL is a backstop, not the primary invalidation mechanism.
- Cache invalidation is driven by events from the outbox, not from request handlers.

## 6. Eventing

- All durable state changes publish events through the Postgres outbox.
- Event payloads contain enough information for downstream consumers to act without re-reading source data.
- Consumers must be idempotent and keyed on a deterministic event id.
- No service writes to another service's tables.

## 7. Security

- Treat every input as untrusted. Validate at the boundary and never re-validate downstream.
- Never log JWTs, secrets, or full user PII.
- Decision logs may include principal id, tenant id, action, resource type, resource id, outcome, and decision id.
- Service-to-service calls require mutual auth or a signed internal token.
- Rate limit all auth-adjacent endpoints.

## 8. Observability

- Use Pino structured logs.
- Use OpenTelemetry tracing across the decision path.
- Every decision response carries a `decision_id` that ties together log, trace, and audit.
- Every error path produces a deterministic error code, not an opaque 500.

## 9. Code and Repo Conventions

- TypeScript strict mode is required.
- Public exports must be typed from `shared/`.
- No `any` in authorization logic.
- Tests for authorization semantics live next to the engine code.
- No business logic in route handlers. Handlers are thin and delegate to services.
- Each service exposes a single composition root for testability.

## 10. Tenancy

- Active tenant context is selected per session or per request, not assumed globally.
- Cross-tenant operations require explicit elevation and are audited separately.
- A principal may belong to many tenants. The engine never assumes one.

## 11. Change Management

- Shared contract changes require updates to `shared/ARCHITECTURE.md` and `shared/ROADMAP.md` when behavior changes.
- Breaking changes follow `v1` to `v2` parallel deployment, not in-place mutation.
- Privileged role changes require an approval flag at the API level.

## 12. Anti-Patterns to Avoid

- Encoding effective permissions into JWTs.
- Inferring tenant context from the principal alone.
- Adding deny semantics as a flag on a role instead of as a policy.
- Letting applications cache decisions without an invalidation channel.
- Writing audit events from outside the mutation transaction.
- Letting the admin API call the decision API to enforce its own access.
