# xypes-identity Architecture

This document is the durable architectural reference for the xypes-identity platform. Agents and contributors should read this before making cross-repo decisions.

## Mission

Provide a SaaS authorization platform that supports dynamic roles, nested groups, scoped bindings, explicit deny, explainability, and auditability, while keeping identity concerns delegated to Supabase.

## Service Map

- `xypes-identity-engine`: authorization core. Owns decision API, control plane APIs, caches, outbox, and audit events.
- `xypes-identity-admin`: governance surface. Owns admin UI and admin API for roles, groups, bindings, reviews, and audits.
- `xypes-identity-sdk`: integration surface. Owns client SDKs and framework middleware.
- `shared/`: contracts, schemas, and durable architectural references.

## Layered Model

1. Identity layer (Supabase): users, sessions, OAuth, MFA.
2. Directory layer (engine): tenants, applications, principals, groups, group memberships.
3. Authorization layer (engine): permissions, role definitions, role bindings, deny policies, evaluation.
4. Integration layer (sdk + admin): SDKs, middleware, admin UI, audit and review tools.

## Core Entities

- `tenant`
- `application`
- `principal`
- `tenant_membership`
- `group`
- `group_membership`
- `permission`
- `role_definition`
- `role_permission`
- `role_binding`
- `deny_policy`
- `audit_event`
- `access_review`
- `outbox_event`

## Authorization Semantics (binding rules)

- Roles are definitions only. They map to permissions.
- Bindings attach roles to principals or groups at a specific scope.
- Role bindings have explicit effectiveness state. Only `active` bindings participate in authorization decisions; `eligible` bindings are visible for governance but are not effective.
- Scopes: `platform`, `tenant`, `application`, `resource`.
- Deny is an explicit policy, not a role attribute.
- Deny overrides allow at the same or broader scope.
- Nested group traversal is bounded. Default depth: 16.
- Cycles are rejected at write time.
- Toxic role combinations are tenant-scoped rule pairs and are blocked at binding time when they would overlap on the same subject.
- Role definitions marked `approval_required` must enter the system as `eligible` bindings first until a later activation workflow promotes them.

## Identity Bridge

- Supabase issues JWTs with stable identity claims only.
- The engine maps the Supabase `sub` to an internal `principal`.
- Active tenant context is per session or per request, never assumed globally.
- The identity bridge is an adapter boundary: callers use the bridge contract, not Supabase-specific semantics, so the upstream IdP can change later.
- Principal-to-external-id mappings must remain deterministic, unique, and exportable for reconciliation, migration, and compliance workflows.
- JWT handling must validate signature, issuer, audience, expiry, and not-before constraints before principal resolution proceeds.

## Decision Flow

1. Application verifies Supabase JWT.
2. Application sends `principal_id`, `tenant_id`, `application_id`, `action`, `resource`, and `context` to the engine.
3. Engine checks decision cache. On miss, expands graph, applies bindings and deny policies.
4. Engine returns `outcome`, `decision_id`, `reason_code`, and matched bindings.
5. Application enforces and logs `decision_id`.

For privileged writes, billing actions, tenant administration, or cross-tenant operations, the application must fail closed if identity freshness or authorization freshness cannot be established. Any degraded-mode behavior is limited to explicitly approved low-risk reads with bounded TTLs and full observability.

## Eventing

- All mutations write to a Postgres outbox in the same transaction.
- A worker consumes outbox events and:
  - invalidates affected cache keys
  - publishes audit events
  - triggers access review signals when privileged access changes
- Identity lifecycle changes from the upstream IdP should enter the platform through idempotent webhook ingestion plus scheduled reconciliation; webhooks are not the only consistency mechanism.

## Tenancy

- Multi-tenant by default. Tenant id is required on every multi-tenant table and authorization input.
- Cross-tenant operations require explicit elevation and produce separate audit entries.

## Boundaries

- The admin API may not bypass the engine to read or write authorization data without producing audit events.
- The SDK never implements policy locally. It calls the engine.
- The engine never depends on admin or SDK code.
- Applications must not trust JWT role or group claims as authoritative authorization data for sensitive actions.
- Tenant context is always explicit in bridge and authorization calls; it is never inferred from the principal alone.

## Audit And Observability

- Session resolution, privileged mutations, and authorization decisions must be traceable through structured logs, audit events, and `decision_id` where applicable.
- Audit records store stable identity references and token metadata needed for investigation, but never raw bearer tokens or unnecessary PII.
- Platform telemetry must cover token validation failures, webhook processing lag, cache hit ratio, invalidation propagation, and authorization latency.

## Developer Experience And Portability

- The safe path must be the easy path: SDKs and guides should steer applications toward forwarding Supabase JWTs to the bridge instead of parsing authorization state locally.
- Onboarding for a new application should be automatable: create application roles and policies, map the upstream project to a tenant, and verify a working integration path.
- Deployed internal application secrets should come from a managed cloud secret manager through runtime injection or a startup-only adapter, not from `xypes-identity` or long-lived server-side `.env` files.
- Identity mappings, relevant user metadata, and audit logs must be exportable in standard formats so the platform can satisfy migration and compliance requirements.

## Evolution Path

- Phase 1: Identity bridge.
- Phase 2: Authorization core.
- Phase 3: Control plane APIs.
- Phase 4: Performance and eventing.
- Phase 5: Governance and safety.
- Phase 6: SDK and integration surface.
- Future: optional ABAC via policy engine integration, optional ReBAC via relationship engine integration.

## References

- `./ROADMAP.md`
- `../docs/EXECUTION_PLAN.md`
- `../docs/AUTH_THREAT_MODEL.md`
- `../docs/AUTH_FAILURE_RUNBOOK.md`
- `../docs/IDENTITY_BRIDGE_CONSUMER_GUIDE.md`
- `../docs/CONSUMER_ONBOARDING_CHECKLIST.md`
- `../docs/TELEMETRY_BASELINE.md`
- `../docs/STAGING_GATE.md`
- `../docs/DESIGN_GUIDELINES.md`
- `../docs/RUNTIME_SECRET_MANAGEMENT.md`
- `../docs/SUPABASE_HYBRID_ARCHITECTURE.md`
- `../docs/TECH_STACK_EVALUATION.md`
- `../docs/RBAC_ROADMAP_REVIEW.md`
