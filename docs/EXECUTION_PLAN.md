# xypes-identity Execution Plan

## Operating Principles

1. Treat authorization as a product, not a feature.
2. Identity and authorization are separate concerns. Supabase handles identity. xypes-identity owns authorization.
3. The control plane and the runtime decision plane evolve at different speeds and must be designed as different services.
4. Every decision must be explainable, auditable, and revocable.
5. Tenant boundaries are first-class. There is no implicit global state.
6. Backend is the source of truth. Admin UI and SDK must never bypass it.
7. Schema and contracts live in `shared/` and are versioned.
8. Optimize for correctness first, latency second, throughput third.

## Execution Phases

### Phase 0: Foundations

Outcome: shared contracts, agent topology, and engineering rails in place.

- Multi-root workspace and per-repo scaffolding.
- Shared contracts package skeleton in `shared/`.
- Platform orchestrator and per-repo agent files.
- Design guidelines and execution plan committed.
- Engineering rails: TypeScript strict mode, Pino logger config, JSON Schema validation policy, OpenTelemetry plan.
- Baseline threat model for session resolution and authorization flows, kept current as rollout expands. See `docs/AUTH_THREAT_MODEL.md`.

Exit criteria:

- workspace opens with all roots
- repo agent-context files exist
- shared types compile in isolation

### Phase 1: Identity Bridge

Outcome: a verified link between Supabase identity and internal principals.

- Define `principal` and `tenant_membership` tables.
- Build the `POST /v1/auth/resolve-session` endpoint.
- Verify Supabase JWT signature, extract `sub`, map to internal principal, attach active tenant.
- Reject unknown tenants explicitly.
- Emit `principal.resolved` event for auditing.
- Keep the bridge behind an IdP adapter boundary so the external identity provider can change without changing authorization semantics.
- Make the `principal <-> external_id` mapping exportable for migration, reconciliation, and compliance use cases.

Exit criteria:

- a Supabase-issued JWT resolves into a typed `PrincipalContext`
- tests cover missing principal, suspended principal, wrong tenant, expired token
- contract tests cover issuer and audience mismatch, key rotation behavior, and clock-skew boundaries

### Phase 2: Authorization Core

Outcome: scoped RBAC with nested groups and explicit deny.

- Tables: `application`, `group`, `group_membership`, `permission`, `role_definition`, `role_permission`, `role_binding`, `deny_policy`.
- Cycle detection for nested groups.
- Build `POST /v1/authorize/check`.
- Build `POST /v1/authorize/explain`.
- Decisions return: outcome, matched binding ids, deny source if any, decision id.

Exit criteria:

- nested group access works with bounded traversal depth
- deny always overrides allow at the same or broader scope
- explain endpoint returns a deterministic chain

### Phase 3: Control Plane APIs

Outcome: admin-facing CRUD with safety controls.

- Role registry with `draft / active / deprecated / retired` states.
- Group directory with owner, type, and scope.
- Binding APIs scoped to platform, tenant, application, or resource.
- Approval flag for privileged role definitions.
- Audit events for every mutation with before/after payloads.

Exit criteria:

- every mutation produces an audit event with actor, reason, and diff
- privileged role changes require approval flag
- binding scope is always explicit

### Phase 4: Performance and Eventing

Outcome: production-grade latency and revocation semantics.

- Add Redis decision cache and expansion cache.
- Implement Postgres outbox.
- Worker process consumes outbox events and invalidates caches.
- Add OpenTelemetry tracing on the decision path.
- Add structured Pino logs with decision ids.
- Define outage handling when Supabase or JWKS resolution is unavailable, with fail-closed behavior for privileged operations and tightly bounded degraded reads only where explicitly approved.
- Instrument webhook lag, token validation failures, cache hit ratio, invalidation propagation, and authorization latency.

Exit criteria:

- median decision latency under target SLO
- membership or binding change invalidates affected caches within target propagation SLO
- every decision has a traceable id across logs, audit, and trace
- operators can distinguish token-validation failures, upstream identity outages, and cache-staleness fallback through metrics and deterministic error codes

### Phase 5: Governance and Safety

Outcome: SaaS-grade access governance.

- Access review jobs for stale groups, stale bindings, orphaned owners.
- Separation-of-duties checks for toxic role combinations.
- Eligible vs active assignments for privileged roles.
- Tenant suspension propagation.
- Disaster recovery mirror plan documented and exercised.
- Disaster recovery runbook: see `docs/DISASTER_RECOVERY_PLAN.md`. Current exercise status is documentation/tabletop until a live non-production restore drill is executed.

Current implementation note:

- The engine is materially ahead on the Phase 5 authorization and governance semantics: access reviews, binding-time toxic-combination blocking, eligible versus active bindings, and suspension propagation are implemented. The remaining gap is operational completion of the disaster recovery drill and fuller admin-facing governance workflows.

Exit criteria:

- access reviews produce actionable findings
- toxic combinations are blocked at binding time
- tenant suspension immediately revokes runtime access

### Phase 6: SDK and Integration Surface

Outcome: clean, opinionated integration story for applications.

- TypeScript SDK with `authorize.check`, `authorize.explain`, and middleware helpers.
- TypeScript SDK wrappers for `resolve-session` and `authorize.check` that hide token parsing and enforce safe calling patterns.
- Express and Fastify middleware adapters.
- Examples for resolving session, scoping by tenant, and enforcing per-route policies.
- SDK respects decision id propagation for traceability.
- Publish integration guides that specify header handling, tenant selection, and session refresh expectations for Supabase-backed apps.
- Provide onboarding scripts or automation to create application roles and policies and map new Supabase projects to tenants.
- Ship a migration checklist and reference app path so dependent teams can adopt the platform quickly and consistently.

Current implementation note:

- The SDK now has typed client APIs, framework middleware, deny-aware errors, copyable sample app entrypoints under `xypes-identity-sdk/examples/`, a canonical consumer integration guide in `./IDENTITY_BRIDGE_CONSUMER_GUIDE.md`, and a manual onboarding checklist in `./CONSUMER_ONBOARDING_CHECKLIST.md`. This is strong Phase 6 progress, but it is not yet the same thing as onboarding automation or a standalone reference consumer app with independent end-to-end validation.

Exit criteria:

- a sample app integrates auth + authorization end-to-end with under 30 lines of glue code
- SDK ships with strict types from `shared/`

## Rollout Strategy

1. Internal pilot with one tenant and at least two representative applications, ideally one user-facing app and one backend service.
2. Shadow mode: applications call the engine but do not enforce, only log mismatches.
3. Enforcement mode behind a per-tenant feature flag.
4. Default-on after observed mismatch rate stays at zero over a stable window.

The concrete non-production gate for these transitions is defined in `docs/STAGING_GATE.md`.

Current status note:

- These rollout stages remain the intended plan. The repo currently shows the platform primitives needed for later rollout, but not yet a completed pilot, shadow-mode mismatch logging workflow, or tenant-scoped enforcement flag implementation.
- Pilot readiness also remains incomplete until the documented threat model, auth-failure runbook, and staging gate are exercised in a repeatable non-production environment with recorded pilot evidence. See `docs/AUTH_THREAT_MODEL.md`, `docs/AUTH_FAILURE_RUNBOOK.md`, and `docs/STAGING_GATE.md`.
- Pilot readiness also remains incomplete until the documented threat model, auth-failure runbook, and staging gate are exercised in a repeatable non-production environment with recorded pilot evidence. Use `docs/PILOT_EVIDENCE_TEMPLATE.md` for the expected evidence record shape.

## SLOs (initial targets)

- decision API p50 under 10 ms cache hit, p95 under 50 ms cache miss
- propagation of membership or binding change under 5 s
- audit event durability: at-least-once delivery with deduplication on `decision_id`
- explain API p95 under 200 ms
- webhook processing lag stays within a defined operational window and pages when exceeded
- token validation and JWKS fetch failure rates are measured and alertable

Current evidence note:

- Redis-backed caches, outbox processing, worker invalidation, structured logs, and decision tracing hooks are implemented. This repo does not yet provide durable operational evidence that these SLOs are being measured and met in a repeatable environment. The minimum rollout-facing signal set and current evidence gap are defined in `docs/TELEMETRY_BASELINE.md`.

## Quality Gates

1. Every endpoint has a JSON Schema and a contract test.
2. Every mutation has an audit event test.
3. Every cache invalidation path has a test that proves staleness is bounded.
4. Every deny rule has an explicit test that proves it overrides allow.
5. No PR may add roles or bindings without scope.
6. Identity-bridge changes include contract tests for `resolve-session` and integration coverage for webhook-driven lifecycle sync.
7. Chaos scenarios cover key rotation, temporary identity-provider outages, and stale-cache recovery on the hot path.
8. Session-resolution and decision endpoints publish a machine-readable API reference generated from the boundary schemas so consumer integrations and contract tests stay aligned.
9. Rollout-facing auth changes include updates to the threat model, the auth-failure runbook, and the staging gate when promotion criteria or pilot shape changes.

## Risk Register

| Risk                                                    | Mitigation                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Apps trust JWT claims directly                          | SDK forces decision API calls for sensitive actions                                               |
| Cache staleness leaks access                            | Event-driven invalidation + bounded TTL fallback                                                  |
| Cross-tenant access bugs                                | Tenant id required in every authorization input                                                   |
| Nested group cycles                                     | Cycle detection on every membership write                                                         |
| Audit gaps during incidents                             | Outbox + replay; never write authorization changes outside the outbox transaction                 |
| Identity drift between Supabase and internal principals | Periodic reconciliation job + alert on orphans                                                    |
| Identity-provider outage or lock-in                     | Adapter boundary, exportable mappings, tested degraded-mode policy, migration plan                |
| Webhook lifecycle lag causes stale membership state     | Idempotent webhook ingestion, measured lag, periodic reconciliation, fail-closed suspension rules |

## Recommended Defaults

- Use short-lived access JWTs with server-validated refresh flows; do not treat long-lived access tokens as the revocation mechanism.
- Cache resolved principals for about 60 seconds only as a backstop, and invalidate on lifecycle webhook or reconciliation events.
- Cache authorization decisions for about 30 seconds on high-frequency paths, with immediate invalidation on binding, deny-policy, membership, or suspension changes.
- Retain immutable auth and audit logs for the full compliance window, such as one year where that matches customer and regulatory requirements.

## Definition of Done for the Platform

- Authorization decisions are correct, fast, explainable, and revocable.
- Admin actions are governed and audited.
- Applications integrate through a stable SDK using stable contracts.
- Operators can debug any access decision from a single decision id.
- The platform can evolve toward ABAC or ReBAC without breaking existing applications.
