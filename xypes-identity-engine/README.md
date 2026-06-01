# Engine

Home for the authorization service, graph traversal logic for nested groups, permission evaluation, cache invalidation, and audit/event handlers.

## Current implementation status

Implemented in this repo:

- SQL table definitions for `principal` and `tenant_membership` in `sql/0001_phase1_identity_bridge.sql`
- Phase 2 authorization tables in `sql/0002_phase2_authorization_core.sql` for applications, groups, permissions, role bindings, and explicit deny policies
- Phase 3 mutation foundations in `sql/0003_phase3_mutation_foundations.sql` for audited mutations via `audit_event`, same-transaction outbox persistence via `outbox_event`, and an additive `approval_required` flag on `role_definition`
- typed `POST /v1/applications` route in `src/routes/create-application-route.ts` for creating tenant-scoped applications with same-transaction application, audit, and outbox writes
- typed `POST /v1/role-bindings` route in `src/routes/create-role-binding-route.ts` for creating scoped role bindings with same-transaction binding, audit, and outbox writes
- typed `POST /v1/deny-policies` route in `src/routes/create-deny-policy-route.ts` for creating explicit deny policies with subject/scope validation and same-transaction policy, audit, and outbox writes
- typed `POST /v1/groups` route in `src/routes/create-group-route.ts` for creating scoped groups with owner assignment and same-transaction group, audit, and outbox writes
- typed `POST /v1/group-memberships` route in `src/routes/create-group-membership-route.ts` for creating principal or nested-group memberships with bounded write-time cycle rejection and same-transaction membership, audit, and outbox writes
- typed `POST /v1/permissions` route in `src/routes/create-permission-route.ts` for creating tenant-scoped application permissions with same-transaction permission, audit, and outbox writes
- typed `POST /v1/role-definitions` route in `src/routes/create-role-definition-route.ts` for creating draft role definitions with same-transaction role, audit, and outbox writes
- typed `POST /v1/role-permissions` route in `src/routes/attach-role-permission-route.ts` for attaching permissions to role definitions after tenant-scoped existence checks with same-transaction attachment, audit, and outbox writes
- typed `POST /v1/audit-events/query` route in `src/routes/audit-events-route.ts` for tenant-scoped audit visibility over already persisted `audit_event` records with event, entity, correlation, and reference filters
- typed `POST /v1/auth/resolve-session` route in `src/routes/resolve-session-route.ts`
- typed `POST /v1/authorize/check` route in `src/routes/authorize-check-route.ts` with direct principal plus nested group-derived allow and deny evaluation, bounded to depth 16
- typed `POST /v1/authorize/explain` route in `src/routes/authorize-explain-route.ts` that reuses the authorization decision semantics and returns deterministic trace data for matched subjects and nested group traversal
- Supabase-compatible JWT verification via JWKS in `src/services/jwt-session-verifier.ts`
- principal and tenant membership resolution service in `src/services/resolve-session.ts`

The engine is materially ahead across Phases 1 through 5 of the platform roadmap. The main remaining gaps are not core authorization semantics; they are operational evidence and adjacent governance workflow completion in other repos.

## Phase 3 implementation note

Phase 3 work includes engine-local control-plane mutations for application creation, deny-policy creation, group creation, group-membership creation, permission creation, role-binding creation, role-definition creation, role-permission attachment, and audited lifecycle status updates via `PATCH /v1/role-definitions/:role_definition_id/status`.

This now also includes audited role binding lifecycle updates via `PATCH /v1/role-bindings/:role_binding_id/status`, which allows existing bindings to move between `eligible` and `active` state while writing audit and outbox records.

The same persisted audit trail is now queryable through `POST /v1/audit-events/query`, giving operator-facing consumers a tenant-scoped audit visibility surface without reaching into engine storage directly.

Still missing or partial in this repo for the broader control-plane story:

- richer read, list, and lifecycle surfaces beyond the currently implemented mutations
- admin-facing governance workflows and UI, which belong outside this repo

## Phase 4 implementation note

Phase 4 work includes a reusable outbox leasing repository, tenant-versioned Redis decision and expansion caches on the authorization path, cache invalidation modeled from existing control-plane outbox events, and a long-running worker entrypoint that claims outbox batches and advances tenant cache versions without wildcard deletes.

Current limitation:

- this repo shows the mechanisms for caching, eventing, and tracing hooks, but not durable proof that target SLOs are measured and met in a repeatable runtime environment

## Phase 5 implementation note

Phase 5 work includes tenant and tenant-membership suspension propagation on authorize check and explain, binding-time separation-of-duties enforcement, and engine-local eligible vs active role binding state. Toxic role combinations are modeled in `sql/0004_phase5_governance_safety.sql` and `POST /v1/role-bindings` now fails with `409 ROLE_BINDING_SOD_CONFLICT` when a tenant-scoped toxic pair would be assigned to the same principal or group across overlapping scopes. `sql/0005_phase5_eligible_assignments.sql` adds `role_binding_status`, `POST /v1/role-bindings` now creates `approval_required` roles as `eligible`, and only `active` bindings are effective on `POST /v1/authorize/check` and `POST /v1/authorize/explain`.

`PATCH /v1/role-bindings/:role_binding_id/status` provides the activation path for those eligible bindings and emits the same audited and outbox-backed mutation trail as the create path.

Current limitation:

- the engine supports the underlying governance semantics, but disaster recovery remains operationally incomplete until a live non-production restore drill is executed and recorded, and the approval activation workflow is not yet represented here as a completed end-user governance flow

## Environment

- `DATABASE_URL`
- `REDIS_URL`
- `SUPABASE_JWT_ISSUER`
- `SUPABASE_JWT_AUDIENCE`
- `SUPABASE_JWKS_URL`
- `PORT` (optional, defaults to `3000`)
- `AUTHORIZATION_DECISION_CACHE_TTL_SECONDS` (optional, defaults to `30`)
- `AUTHORIZATION_EXPANSION_CACHE_TTL_SECONDS` (optional, defaults to `30`)
- `OUTBOX_BATCH_SIZE` (worker only, optional, defaults to `100`)
- `OUTBOX_LEASE_SECONDS` (worker only, optional, defaults to `30`)
- `OUTBOX_RETRY_DELAY_SECONDS` (worker only, optional, defaults to `30`)
- `OUTBOX_POLL_INTERVAL_MS` (worker only, optional, defaults to `1000`)

`REDIS_URL` is required for both the HTTP server and the worker. The engine uses Redis for two things at once: low-latency shared cache reads on authorize paths and shared tenant version stamps that let every process observe invalidation without key scans or local-only state.

## Scripts

- `npm run build`
- `npm test`
- `npm run dev`
- `npm run dev:worker`
- `npm run start`
- `npm run start:worker`

Run the HTTP server and the outbox worker as separate processes. The server serves `/v1/authorize/check` and `/v1/authorize/explain` using Redis-backed caches. The worker consumes `authorization.control-plane` outbox events and bumps tenant-scoped decision and expansion versions so stale cache entries naturally fall out of use.

## Docker local testing

Build the engine image from the workspace root so the local `file:../shared` dependency resolves during `npm ci`:

```bash
docker build -f xypes-identity-engine/Dockerfile .
```

The Dockerfile builds `shared/` first, then installs and builds `xypes-identity-engine/`. A root-level `docker-compose.yml` can use the same workspace-root build context for local integration testing.

For the full local stack, start it from the workspace root:

```bash
docker compose up --build
```

If the Postgres volume already exists, run `docker compose down -v` first so the init SQL and local resolve-session seed run again. The same workspace-root compose file also starts Redis, which the engine now requires for cache reads and tenant version invalidation. For host-run workflows that reuse these support containers, the compose file publishes Postgres on `55432` and Redis on `56379` by default to avoid common workstation port conflicts.

## Resolve-session local walkthrough

The local Docker stack seeds two principals and two tenant ids specifically for `POST /v1/auth/resolve-session`:

- `local-active-member` -> active membership in tenant `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1`
- `local-suspended-member` -> suspended membership in tenant `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2`

Mint a token with the local helper service. The helper defaults to the same issuer and audience that the engine expects in `docker-compose.yml`.

```bash
TOKEN="$(docker compose --profile tools run --rm -T \
	-e TOKEN_SUBJECT=local-active-member \
	-e TOKEN_EMAIL=active.member@example.test \
	token-mint)"
```

If you want a different token lifetime, set `TOKEN_EXPIRES_IN`, for example `-e TOKEN_EXPIRES_IN=15m`.

### 1. Success

```bash
TOKEN="$(docker compose --profile tools run --rm -T \
	-e TOKEN_SUBJECT=local-active-member \
	-e TOKEN_EMAIL=active.member@example.test \
	token-mint)"

curl -i http://localhost:3000/v1/auth/resolve-session \
	-H "content-type: application/json" \
	-d '{
		"token": "'"$TOKEN"'",
		"tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"
	}'
```

Expected result: `200 OK` with `principal_status: "active"` and `membership_status: "active"`.

### 2. Missing membership

```bash
TOKEN="$(docker compose --profile tools run --rm -T \
	-e TOKEN_SUBJECT=local-active-member \
	-e TOKEN_EMAIL=active.member@example.test \
	token-mint)"

curl -i http://localhost:3000/v1/auth/resolve-session \
	-H "content-type: application/json" \
	-d '{
		"token": "'"$TOKEN"'",
		"tenant_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2"
	}'
```

Expected result: `403` with code `AUTH_TENANT_MEMBERSHIP_NOT_FOUND`.

### 3. Suspended membership

```bash
TOKEN="$(docker compose --profile tools run --rm -T \
	-e TOKEN_SUBJECT=local-suspended-member \
	-e TOKEN_EMAIL=suspended.member@example.test \
	token-mint)"

curl -i http://localhost:3000/v1/auth/resolve-session \
	-H "content-type: application/json" \
	-d '{
		"token": "'"$TOKEN"'",
		"tenant_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2"
	}'
```

Expected result: `403` with code `AUTH_TENANT_MEMBERSHIP_SUSPENDED`.

The token helper lives under `docker/jwks-mock/`, reads the local-only private JWK there, and prints a signed JWT to stdout. The helper uses Node's native JWK import path so it remains compatible with current Node 22 container images.

## Resolve-session outage behavior

`POST /v1/auth/resolve-session` now distinguishes invalid tokens from temporary verification-path outages.

- `AUTH_INVALID_TOKEN`: the token cannot be validated as a legitimate bearer token for this issuer and audience
- `AUTH_TOKEN_EXPIRED`: the token is otherwise valid but expired
- `AUTH_JWKS_UNAVAILABLE`: the engine could not reach or use the configured JWKS source
- `AUTH_TOKEN_VERIFICATION_UNAVAILABLE`: token verification is temporarily unavailable for another upstream or network reason

The outage-oriented codes should be treated as temporary availability failures. Privileged writes, tenant-admin paths, and cross-tenant operations must remain fail-closed while they persist.
