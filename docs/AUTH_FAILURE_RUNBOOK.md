# xypes-identity Auth-Failure Runbook

## Purpose

This runbook helps operators and integrators distinguish policy denial, tenant-access failure, token-validation failure, and upstream identity outage on the xypes-identity request path.

Use it for failures around:

- `POST /v1/auth/resolve-session`
- `POST /v1/authorize/check`
- `POST /v1/authorize/explain`

For restore and replay scenarios, use `docs/DISASTER_RECOVERY_PLAN.md`.

## Operating Rule

Do not bypass the engine during diagnosis.

Do not treat token claims, app-local caches, or local config as authoritative replacements for the engine decision path.

Privileged writes, tenant-admin actions, and cross-tenant operations remain fail-closed while diagnosis is in progress.

## Fast Classification

Classify the failure in this order:

1. invalid or expired token
2. principal or tenant-membership failure
3. explicit authorization deny
4. upstream identity or bridge outage
5. platform-internal availability issue

## Canonical Failure Categories

### Invalid request-context or token failures

Known deterministic categories already used in the platform-aligned request-context contract include:

- `REQUEST_CONTEXT_AUTH_HEADER_MISSING`
- `AUTH_INVALID_TOKEN`
- `AUTH_TOKEN_EXPIRED`
- `AUTH_JWKS_UNAVAILABLE`
- `AUTH_TOKEN_VERIFICATION_UNAVAILABLE`
- `AUTH_PRINCIPAL_NOT_FOUND`
- `AUTH_PRINCIPAL_SUSPENDED`
- `AUTH_TENANT_MEMBERSHIP_NOT_FOUND`
- `AUTH_TENANT_MEMBERSHIP_SUSPENDED`

Interpretation:

- invalid or expired token is an identity-input problem, not an authorization deny
- JWKS or token-verification unavailability is an upstream identity-availability problem, not an invalid-token result
- missing or suspended principal or membership is a tenant-access problem, not an outage

Operator action:

- verify the presented tenant id and subject mapping
- confirm issuer, audience, and JWKS configuration
- confirm the principal and tenant membership state in the engine source of truth
- do not override these failures with local allow behavior

### Explicit authorization deny

Signal:

- `authorize.check` returns a deny outcome with `decision_id`, `reason_code`, and optional `deny_source`

Interpretation:

- the engine is reachable and returned an intentional policy result

Operator action:

- capture `decision_id`
- inspect `reason_code`, matched bindings, and `deny_source` where present
- use `authorize.explain` for the same tenant, application, action, and resource shape
- investigate bindings, denies, suspension state, and scope alignment before treating the result as a defect

### Upstream identity or bridge outage

Typical symptoms:

- repeated token-validation unavailability
- JWKS fetch failures
- issuer metadata resolution failures
- bridge path unavailable while Postgres authorization state remains healthy

Interpretation:

- this is not a policy deny and must not be treated as one

Operator action:

- confirm whether the failure is localized to JWKS or broader upstream identity availability
- check token-validation failure metrics, JWKS reachability, and recent issuer or key rotation changes
- keep privileged operations fail-closed
- only allow degraded low-risk reads if there is an explicitly approved path with bounded TTL and observability

Current platform note:

- deterministic outage classification is a roadmap requirement and should remain aligned with the bridge outage and JWKS-failure policy work

### Platform-internal availability issue

Typical symptoms:

- Postgres unavailable
- Redis unavailable with broader service instability
- engine process unavailable
- worker replay or invalidation health degraded after restore or mutation load

Interpretation:

- this is a platform availability problem, not an authorization deny

Operator action:

- determine whether the problem is limited to performance state or affects authoritative state
- if Postgres is impaired, follow `docs/DISASTER_RECOVERY_PLAN.md` as needed
- if Redis alone is impaired, expect degraded performance and cache misses, not authorization truth loss

## Diagnosis Table

| Symptom                                       | Likely class                | What it means                                 | Immediate action                                                   |
| --------------------------------------------- | --------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| Missing auth header or malformed bearer token | request-context failure     | caller did not present valid identity input   | reject request, fix caller wiring                                  |
| Expired token                                 | token-validation failure    | identity freshness cannot be established      | require refresh or re-authentication                               |
| Principal not found or suspended              | tenant-access failure       | identity maps to no active platform principal | inspect principal lifecycle state                                  |
| Tenant membership missing or suspended        | tenant-access failure       | subject is not active in the requested tenant | inspect membership and tenant selection                            |
| Deny result with `decision_id`                | authorization deny          | policy intentionally denied access            | inspect `reason_code`, bindings, and explain output                |
| JWKS or token-validation service unavailable  | upstream identity outage    | bridge cannot establish identity freshness    | fail closed for privileged work, investigate upstream availability |
| Engine cannot reach Postgres                  | platform availability issue | authorization truth unavailable               | escalate to platform recovery path                                 |
| Redis degraded but Postgres healthy           | performance degradation     | caches are impaired, truth still in Postgres  | keep service up if possible, monitor latency and replay            |

## Minimum Investigation Checklist

1. Capture the tenant id, application id, action, resource identifiers, and timestamp.
2. Capture any `decision_id` returned.
3. Determine whether the failure happened in `resolve-session` or `authorize.check`.
4. Classify the failure using the table above before making any configuration changes.
5. Verify whether similar failures are isolated to one tenant, one application, or all callers.
6. Check recent changes: role bindings, deny policies, membership changes, token issuer or audience changes, JWKS rotation, deployment rollouts.
7. Preserve logs and audit references needed for follow-up.

## Guardrails During Incidents

- never add app-local allow logic as a temporary workaround
- never treat Redis as the source of truth
- never hide deny sources when sharing operator diagnostics
- never log raw bearer tokens or secret values during debugging

## Escalation Guidance

Escalate to platform engineering when:

- failures affect multiple tenants or applications
- JWKS or bridge failures persist beyond a brief transient window
- deterministic error classification is missing or ambiguous
- a deny appears to contradict the explain result or audit trail
- Postgres truth and observed behavior appear inconsistent

## Companion Documents

- `docs/AUTH_THREAT_MODEL.md`
- `docs/DISASTER_RECOVERY_PLAN.md`
- `docs/EXECUTION_PLAN.md`
