# xypes-identity Roadmap

Durable, cross-repo roadmap. For the operational execution playbook, see `../docs/EXECUTION_PLAN.md`.

## Phase 0: Foundations [completed]

- Multi-root workspace scaffold
- Shared contracts skeleton
- Platform orchestrator and per-repo agent files
- Design guidelines and execution plan

## Phase 1: Identity Bridge

- `principal` and `tenant_membership` tables
- `POST /v1/auth/resolve-session`
- Supabase JWT verification and principal mapping
- IdP adapter boundary so Supabase can be replaced without changing authorization semantics
- Exportable `principal <-> external_id` mapping for migration and compliance workflows

## Phase 2: Authorization Core

- Authorization tables and relations
- Nested group traversal with cycle detection
- `POST /v1/authorize/check`
- `POST /v1/authorize/explain`

## Phase 3: Control Plane APIs

- Role registry with lifecycle states
- Group directory with ownership
- Scoped binding APIs
- Audit events for every mutation

## Phase 4: Performance and Eventing

- Redis decision and expansion caches
- Postgres outbox and worker
- OpenTelemetry tracing
- Pino structured logging with decision ids
- Outage-mode policy for identity-provider failures with explicit fail-closed behavior for privileged operations
- Metrics for token validation failures, webhook lag, cache hit ratio, and authorization latency
  - Current state: authorization check and explain now emit cache-path telemetry on the existing decision span surface, including cache status and cache-version attributes for the decision and expansion paths where applicable
  - Current state: the engine now also exposes `/v1/operations/telemetry` for resolve-session failures, authorization latency, replay timing, and rollout-readiness snapshots, while identity lifecycle telemetry remains explicitly marked `not_configured` until webhook or reconciliation paths exist

## Phase 5: Governance and Safety

- Access reviews
- Separation-of-duties checks with binding-time toxic-combination blocking
- Eligible vs active assignments
  - Engine-first slice: role bindings carry `eligible` or `active` state, and only active bindings are effective on authorize paths
- Tenant suspension propagation
- Disaster recovery plan exercised
  - Current state: disaster recovery is documented and tabletop-complete in `../docs/DISASTER_RECOVERY_PLAN.md`, and the expected live-drill evidence record is now spelled out there, but a live non-production restore drill is still pending

## Phase 6: SDK and Integration Surface

- TypeScript SDK
- Fastify and Express middleware
- Sample applications
  - Current state: the SDK now has typed client APIs, framework middleware, and copyable sample app entrypoints under `../xypes-identity-sdk/examples/`, but not yet a standalone reference consumer app
- Integration guides for forwarding Supabase JWTs to the identity bridge, tenant selection, and refresh behavior
- Onboarding automation for creating application roles and policies and mapping new Supabase projects to tenants
  - Current state: the SDK now includes an onboarding seed renderer plus a checked-in starter manifest for permissions and role definitions, but it still stops short of applying control-plane mutations on behalf of a consuming app
- Migration checklist and reference playbooks so teams can adopt the platform in hours, not days

## Current Assessment [2026-05-28]

### Strengths

- The engine is materially ahead across Phases 1 through 5: identity bridge, authorize check and explain APIs, audited control-plane mutations, outbox-backed cache invalidation, worker processing, tenant suspension propagation, separation-of-duties blocking, access reviews, and eligible versus active bindings are implemented.
- Shared contracts and repo boundaries are holding: the engine remains the source of truth for authorization semantics, the admin surface stays thin over engine APIs, and the SDK does not invent policy.
- Admin now has a stronger operator-facing shaping layer under `src/` for governance and audit visibility: access-review workbench responses plus an audit-events workbench endpoint that groups and summarizes audit evidence without bypassing the engine.
- Engine decision-path observability improved without changing resolve-session or shared error contracts: authorize check and explain now emit explicit cache-status and cache-version attributes on the existing telemetry surface.
- Admin now includes an operator diagnostics view for token-validation failures, authorization latency, and rollout-readiness signals, sourced from the engine telemetry snapshot instead of local policy logic.
- The SDK now has a strong integration baseline with typed client APIs, Express and Fastify middleware, deny-aware error propagation, and copyable sample app entrypoints.

### Missing Or Partial Work

- Admin remains a thin API scaffold. It now includes access-review and audit workbench shaping for operators, but the fuller governance surface is still missing: admin UI, approval workflow UX, richer audit visibility, and operator-facing policy debugging.
- Disaster recovery is documented and tabletop-complete, but not operationally complete until a live non-production restore drill is executed, recorded, and checked in with restore and replay evidence.
- API reference publication for the core session and decision endpoints is now available from the engine boundary, but broader control-plane reference publication is still missing.
- Phase 6 is only partially complete against its exit criteria: sample app entrypoints exist in the SDK, but there is not yet a standalone consumer reference app proving end-to-end integration.
- Rollout mechanics remain planned rather than implemented: internal pilot posture, shadow mode, per-tenant enforcement flags, and mismatch logging are not yet evidenced in the repo.
- Rollout readiness artifacts are now documented through the threat model, auth-failure runbook, and staging gate, but they are not yet exercised with repeatable pilot evidence.
- The engine control plane is still mutation-heavy from a dependent-platform perspective: richer read and list surfaces for applications, permissions, and role definitions are the best next additions for retry-safe provisioning by external platforms such as xypes-docman.
- Operational identity-bridge hardening remains partial: webhook-driven lifecycle sync, deterministic reconciliation, and explicit identity-provider outage behavior are not yet evidenced end to end.
- Developer onboarding remains too manual: there is not yet a first-class automation path for provisioning app roles or mapping new Supabase projects and tenants.
- Migration and portability posture is still mostly architectural intent: exportable identity mappings, compliance-oriented data export, and a concrete IdP swap strategy are not yet represented as shipped platform capabilities.

### Misalignment To Resolve

- This roadmap understates how far the engine has progressed across Phases 3 through 5.
- This roadmap previously overstated two items: disaster recovery exercise completion and sample applications. The current state is documented and tabletop-complete DR plus SDK example entrypoints, not a live-drill-complete recovery posture or a full standalone reference app.
- DR evidence must remain explicit: a documented procedure is not equivalent to a checked-in restore record with timings, replay confirmation, and corrective actions.
- Platform-level planning metadata still lags the implementation state in places and should be refreshed as cross-repo sequencing shifts from foundational build-out to operator experience, rollout, and recovery execution.

### Current Risks

- Operational completeness now lags core authorization semantics. The main platform risk has shifted from policy correctness to rollout, operator experience, and recovery execution.
- Observability, eventing, and caching are implemented, but the repo does not yet provide durable evidence that target SLOs are measured and met in a repeatable way.
- The privileged access model supports eligible versus active bindings, but the later activation and approval workflow remains incomplete as a user-facing governance flow.
- Identity-provider coupling remains a platform risk until the bridge boundary, export flows, and degraded-mode policies are exercised beyond Supabase-only assumptions.
- Lifecycle drift between Supabase users, internal principals, and tenant memberships remains a risk until webhooks and reconciliation are both operating with measurable lag and failure visibility.

### Recommended Next Focus

- Build the missing governance surface in admin on top of the current workbench endpoints: approvals, richer audit visibility, and operator debugging.
- Add read or list surfaces for applications, permissions, and role definitions so dependent platforms can provision authorization state recoverably instead of through blind create-only orchestration.
- Execute and record a live non-production disaster recovery drill.
- Execute and record a live non-production disaster recovery drill, including restore timing, outbox replay behavior, and cache rebuild evidence.
- Add a true reference consumer app or integration harness that proves the SDK's end-to-end path beyond example entrypoints.
- Exercise the documented staging gate with representative pilot evidence for pilot, shadow mode, and tenant-scoped enforcement.
- Add identity lifecycle hardening: webhook ingestion, deterministic reconciliation, and explicit outage handling rules for resolve-session and authorization callers.
- Implement the documented telemetry baseline with operator-facing monitoring and test evidence for token verification failures, webhook lag, cache invalidation latency, and authorization latency.
- Automate onboarding for new applications and tenant mappings, then extend the published migration and integration guides with runnable onboarding evidence and provisioning defaults.

## Near-Term Backlog By Repo

### xypes-identity-engine

- Add deterministic reconciliation jobs and anomaly reporting for `external_id -> principal` and tenant-membership drift.
- Add explicit outage-mode and JWKS-failure behavior with deterministic error codes and fail-closed handling for privileged operations.
- Add contract coverage for `POST /v1/auth/resolve-session` around issuer or audience mismatch, clock skew, and key rotation.
- Add integration and chaos coverage for webhook ingestion, key rotation, and temporary upstream identity outages.
- Expose standard export surfaces for identity mappings and audit data needed for migration and compliance.
- Extend the current decision-path telemetry from cache-status span attributes into operator-facing metrics, dashboards, and rollout evidence.
- Extend the current `/v1/operations/telemetry` snapshot with webhook and reconciliation counters once identity lifecycle sync paths exist.

### xypes-identity-admin

- Extend the current access-review and audit workbench responses into broader operator-facing visibility for webhook lag, reconciliation failures, token validation failures, and authorization latency.
- Current state: admin now exposes `/admin/operations/diagnostics` for token-validation failures, authorization latency, replay visibility, and rollout-readiness shaping from engine telemetry; webhook and reconciliation visibility remains pending engine support.
- Add governance workflows for approval activation, access-review follow-up, and outage-state visibility.
- Add guided onboarding flows for mapping new applications and upstream identity projects to tenants.

### xypes-identity-sdk

- Add first-class wrappers for `resolve-session` and safe forwarding of Supabase JWTs.
- Extend the published integration guides with a stronger sample-app path that demonstrates end-to-end onboarding in a realistic consumer.
- Automate the published onboarding and migration baseline for application-role seeding, tenant mapping, and minimum pre-enforcement validation.
- Current state: the SDK now includes `operations.getTelemetry()` plus `npm run onboarding:seed` and a starter onboarding manifest, but it still lacks a push-button end-to-end bootstrap against live engine control-plane APIs.

### shared and docs

- Keep the bridge contract IdP-agnostic while documenting the current Supabase adapter.
- Document recommended defaults for token TTLs, principal-cache TTLs, decision-cache TTLs, and immutable audit-retention windows.
- Document portability expectations for identity mappings, user metadata export, and audit-log export.
- Maintain a concise threat model and auth-failure runbook for session resolution and authorization flows.
- Publish machine-readable API reference material for the core session and authorization endpoints from the existing boundary schemas.
- Current state: the engine now publishes the shared core session and authorization API reference from `/v1/meta/api-reference`, while DR evidence remains represented only by a pending checked-in drill shell until a real drill is executed.

## Issue-Ready Next Tickets

### PLATFORM-ENG-401: Identity Reconciliation And Drift Detection

Owner repo:

- `xypes-identity-engine`

Goal:

- make Supabase `external_id -> principal -> tenant_membership` drift visible and recoverable before rollout widens

Scope:

- add a deterministic reconciliation job for principals and tenant memberships
- emit anomaly records or metrics for orphaned mappings, duplicate mappings, and suspended-membership mismatches
- document operator remediation paths and replay expectations

Acceptance criteria:

- reconciliation can run idempotently without duplicating principals or memberships
- drift scenarios produce deterministic error codes or metrics that operators can alert on
- suspension or missing-membership mismatches are visible within the defined operational window

### PLATFORM-ENG-402: Bridge Outage And JWKS Failure Policy

Owner repo:

- `xypes-identity-engine`
- `xypes-identity-sdk`

Goal:

- make upstream identity outages predictable for callers instead of leaving them to invent fallback behavior

Scope:

- define deterministic error codes for JWKS fetch failure, token validation unavailability, and bounded degraded reads
- enforce fail-closed behavior for privileged operations
- document the allowed degraded-mode posture for explicitly approved low-risk reads only

Acceptance criteria:

- privileged operations deny deterministically when identity freshness cannot be established
- caller-facing docs state when degraded mode is allowed and when it is forbidden
- tests cover JWKS fetch failure and recovery without changing authorization semantics

### PLATFORM-ENG-403: Identity Bridge Contract And Consumer Guides

Owner repo:

- `xypes-identity-sdk`
- `shared`

Goal:

- make the safe integration path obvious for application teams consuming Supabase-backed identity

Scope:

- publish the bridge contract for forwarding bearer tokens and explicit tenant context
- add SDK guidance for `resolve-session`, `authorize.check`, `decision_id`, and deny handling
- add migration notes for consumers moving from token-claim authorization to engine-backed authorization

Acceptance criteria:

- consumer docs show one canonical request path from bearer token to engine decision
- docs explicitly prohibit local authorization from token role or group claims
- sample code demonstrates decision-id propagation and explicit tenant handling

### PLATFORM-OPS-404: Identity And Authorization Telemetry Baseline

Owner repo:

- `xypes-identity-engine`
- `xypes-identity-admin`

Goal:

- establish the minimum metrics and visibility needed before pilot rollout

Scope:

- instrument token validation failures, webhook lag, cache hit ratio, invalidation latency, and authorization latency
- surface these signals in operator-facing views or documented dashboards
- define page-worthy thresholds for bridge and authorization degradation

Acceptance criteria:

- the platform emits the baseline metrics in non-production and local integration environments
- operator docs identify which signals indicate bridge drift, upstream outage, or cache-staleness risk
- rollout readiness can reference measured telemetry rather than implementation intent

### PLATFORM-DX-405: Onboarding Automation And Migration Checklist

Owner repo:

- `xypes-identity-sdk`
- `xypes-identity-admin`
- `shared`

Goal:

- reduce consumer onboarding from bespoke setup to a repeatable integration path

Scope:

- script or guide application-role and permission seeding
- document mapping of a new Supabase project to tenant-aware identity bridge expectations
- publish a migration checklist covering token forwarding, tenant selection, deny handling, and audit verification

Acceptance criteria:

- a new application team can complete initial integration from docs without reverse-engineering repo internals
- onboarding artifacts cover both greenfield setup and migration from local token-claim checks
- docs identify the minimum validation steps before enabling enforcement in a tenant

### PLATFORM-SEC-406: Threat Model And Auth-Failure Runbook

Owner repo:

- `shared`
- `docs`

Goal:

- make rollout-facing security assumptions and incident handling explicit before pilot scope expands

Scope:

- document the threat model for `resolve-session`, `authorize.check`, and their surrounding trust boundaries
- publish a concise auth-failure runbook covering token validation failures, JWKS failures, bridge outages, and deny-vs-outage diagnosis
- keep the runbook aligned with deterministic error codes and current degraded-mode policy

Acceptance criteria:

- operators can distinguish invalid-token, tenant-access, authorization-deny, and upstream-outage paths from one maintained document set
- the threat model names trust boundaries, attacker goals, and the intended fail-closed posture for privileged operations
- rollout and pilot checklists link to the same runbook and threat model artifacts

### PLATFORM-API-407: Published Session And Decision API Reference

Owner repo:

- `xypes-identity-engine`
- `shared`

Goal:

- give consuming teams a stable machine-readable description of the core auth endpoints without creating a second contract source of truth

Scope:

- generate or publish API reference material for `POST /v1/auth/resolve-session`, `POST /v1/authorize/check`, and `POST /v1/authorize/explain` from the existing boundary schemas
- align the published reference with contract tests and versioning rules
- document how consumer teams should depend on the published reference during integration

Acceptance criteria:

- consumer teams can inspect the core auth endpoint contracts without reverse-engineering implementation files
- published API reference material is derived from the same schema source used for validation or contract testing
- contract changes update the published reference as part of normal review

### PLATFORM-ROLLOUT-408: Staging Gate And Representative Pilot Integrations

Owner repo:

- `xypes-identity-engine`
- `xypes-identity-sdk`
- `xypes-identity-admin`

Goal:

- replace aspirational rollout language with a concrete non-production gate and representative pilot shape

Scope:

- define the non-production environment and checks that gate promotion for auth changes
- require at least two representative pilot integrations, ideally one user-facing app and one backend service
- document the contract, integration, and observability checks that must pass before widening enforcement

Acceptance criteria:

- pilot scope names the required consumer shapes rather than only a generic application count
- promotion guidance references repeatable non-production checks instead of ad hoc validation
- rollout decisions can point to measured contract, integration, and telemetry evidence

## Later

- Optional ABAC integration via OPA
- Optional ReBAC integration via OpenFGA
- Optional Kafka or NATS once event volume justifies it
- IdP portability work beyond Supabase, preserving the same bridge contract for callers
- Standard export surfaces for identity mappings, user metadata, and audit logs to satisfy migration and compliance workflows

### PLATFORM-OPS-409: Managed Secret Manager Baseline

Owner repo:

- `shared`
- `docs`

Goal:

- make runtime secret handling for internal applications explicit before more consumer apps and environments are onboarded

Scope:

- document the default secret-management posture as managed cloud secret managers rather than app-local `.env` distribution
- define the boundary that `xypes-identity` stores authorization and identity configuration, not downstream application secrets
- document how applications retrieve secrets per environment and how local development differs from deployed environments

Acceptance criteria:

- platform docs state one default runtime pattern for internal app secrets
- consumer teams know that production secrets belong in the cloud secret manager attached to their runtime environment, not in `xypes-identity`
- local development guidance distinguishes ephemeral `.env` use from deployed secret delivery
