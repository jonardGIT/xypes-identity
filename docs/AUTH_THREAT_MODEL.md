# xypes-identity Auth Threat Model

## Scope

This threat model covers the authorization-critical request path for:

- `POST /v1/auth/resolve-session`
- `POST /v1/authorize/check`
- `POST /v1/authorize/explain`

It focuses on the current platform architecture: Supabase as the identity provider, xypes-identity as the authorization system of record, Redis as non-authoritative cache state, and Postgres as the source of truth.

Out of scope:

- Supabase internal implementation details
- infrastructure controls not represented in this workspace
- future ABAC or ReBAC engines that are not yet part of the deployed architecture

## Security Objectives

The platform must:

- enforce tenant isolation explicitly
- deny privileged actions when identity freshness or authorization freshness cannot be established
- keep authorization decisions explainable, traceable, and auditable
- prevent callers from treating JWT role or group claims as authoritative authorization data
- keep deny precedence, scope rules, and suspension semantics consistent under failure

## Protected Assets

- authorization state in Postgres
- principal and tenant-membership mappings
- deny policies, role definitions, role bindings, and group memberships
- decision integrity, including `outcome`, `reason_code`, and `decision_id`
- audit and outbox records used for incident investigation and cache invalidation
- service runtime configuration, including JWT validation settings and internal connection secrets

## Trust Boundaries

1. External caller to application.
   The bearer token, tenant selector, and request payload are untrusted input.
2. Application to xypes-identity bridge.
   The application must forward the token and explicit tenant context without inventing authorization semantics locally.
3. xypes-identity to Supabase JWKS and issuer metadata.
   Upstream identity availability and signing-key freshness are dependencies, not trusted constants.
4. xypes-identity to Postgres.
   Postgres is authoritative for authorization and audit state.
5. xypes-identity to Redis.
   Redis is performance state only and may be stale or empty.
6. Admin and SDK surfaces to engine.
   These are integration layers and must not bypass engine semantics.

## Attacker Goals

- obtain access in the wrong tenant
- convert an upstream identity outage into an unintended allow
- exploit stale cache state after membership, binding, or deny changes
- hide deny causes or make incident investigation ambiguous
- use forged, expired, or mis-scoped tokens to resolve an active principal
- abuse bridge or authorization endpoints for enumeration or high-rate failure traffic
- exfiltrate sensitive data through logs, audit surfaces, or error payloads

## Key Assumptions

- Supabase-issued JWTs are used only for identity context, not as proof of effective permissions.
- Tenant context is explicit on every authorization-relevant request.
- Postgres recovery defines the recovered authorization truth.
- Redis may be flushed without authorization data loss.
- Privileged operations fail closed when upstream identity freshness cannot be established.
- The engine remains the only authority for authorization semantics.

## Primary Threats And Intended Mitigations

### 1. Token misuse or forgery

Threat:

- forged token
- wrong issuer or audience
- expired token
- token used outside intended tenant context

Mitigations:

- validate signature, issuer, audience, expiry, and not-before before principal resolution
- require explicit tenant id rather than inferring tenant context from `sub`
- reject unknown, suspended, or mismatched principals and memberships with deterministic error paths

### 2. Authorization bypass in consumers

Threat:

- application trusts JWT claims, local config, or cached allow state instead of calling the engine

Mitigations:

- SDK and docs define a canonical request path: bearer token plus explicit tenant to `resolve-session`, then `authorize.check`
- docs explicitly prohibit local authorization from token role or group claims
- admin and SDK surfaces remain thin over engine behavior

### 3. Stale authorization after mutation

Threat:

- role, membership, suspension, or deny changes are not observed quickly enough and callers receive outdated decisions

Mitigations:

- Redis is treated as a backstop cache only
- invalidation is driven by outbox-backed events
- TTLs are bounded and not the primary correctness mechanism
- replay and recovery procedures rebuild invalidation state from Postgres-backed truth

### 4. Outage-to-allow conversion

Threat:

- JWKS fetch failure, upstream identity outage, or bridge degradation accidentally becomes effective access

Mitigations:

- privileged writes, tenant administration, and cross-tenant operations fail closed
- degraded behavior, where ever approved, is limited to explicitly approved low-risk reads with bounded TTLs and observability
- runbooks distinguish deny from outage so operators do not override policy during diagnosis

### 5. Cross-tenant confusion

Threat:

- callers or operators accidentally act in the wrong tenant because tenant selection is implicit or inconsistently enforced

Mitigations:

- tenant id is required in every authorization input
- cross-tenant operations require explicit elevation and separate auditability
- tenant membership failures remain deterministic and visible

### 6. Audit or explainability gaps

Threat:

- operators cannot determine whether a failure was policy, identity, or outage related

Mitigations:

- every decision carries a `decision_id`
- deterministic error codes are required on error paths
- audit and structured logs preserve enough metadata for investigation without logging raw bearer tokens or unnecessary PII

### 7. Privileged governance misuse

Threat:

- operator tooling hides deny sources, bypasses the engine, or performs unsafe mutations without review context

Mitigations:

- admin flows delegate to engine APIs
- privileged role changes require approval-aware semantics
- explain results must surface deny sources faithfully rather than flattening them away

## Failure Posture

The intended failure posture is:

- fail closed for privileged writes, tenant-admin operations, and cross-tenant operations
- never transform bridge uncertainty into an allow decision
- treat Redis loss as recoverable performance degradation, not authorization data loss
- prefer deterministic deny or explicit outage classification over ambiguous fallback behavior

## Residual Risks

- operational rollout remains risky until staging gates and representative pilot integrations are defined and exercised
- identity-provider coupling remains a platform dependency until outage behavior, migration posture, and export paths are tested beyond architecture intent
- lifecycle drift remains a risk until webhook ingestion and reconciliation are both operating with measurable lag and anomaly visibility

## Required Companion Documents

- `docs/AUTH_FAILURE_RUNBOOK.md`
- `docs/DISASTER_RECOVERY_PLAN.md`
- `docs/EXECUTION_PLAN.md`
- `shared/ARCHITECTURE.md`
