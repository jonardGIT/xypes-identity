# Admin

Minimal admin API scaffold for the xypes-identity platform. This repo currently exposes thin Fastify routes that delegate privileged control-plane mutations to the engine through the local SDK. It does not enforce authorization locally and does not access engine storage directly. It now also includes a small admin-owned governance console for access review workbench flows.

## Phase 5 safety surfacing

The current admin scaffold surfaces Phase 5 safety outcomes only where it already fronts engine APIs:

- `POST /admin/role-bindings` passes through engine role binding payloads unchanged, including the additive `role_binding_status` field used to distinguish `eligible` from `active` assignments.
- `PATCH /admin/role-bindings/:role_binding_id/status` passes through engine role binding status updates unchanged, including activation of previously `eligible` privileged bindings.
- `POST /admin/role-bindings` passes through engine `409 ROLE_BINDING_SOD_CONFLICT` responses unchanged, including the engine-provided message and deterministic error code.
- Every admin mutation route returns the SDK's `error`, `message`, `statusCode`, and `code` payload verbatim when the engine responds with a typed API error.

This repo does not currently proxy the engine decision endpoints or session-resolution endpoints. The new authorize deny reason codes `PRINCIPAL_SUSPENDED` and `TENANT_MEMBERSHIP_SUSPENDED` are therefore not surfaced by an admin-owned route yet; they remain available from the engine's authorization APIs directly.

- `POST /admin/access-reviews/findings` forwards access review findings queries to the engine via the SDK and returns the engine's generated findings payload unchanged, including additive finding fields such as `role_binding_status` when present.
- `POST /admin/access-reviews/workbench` builds an admin-facing review workbench payload on top of the raw findings query so a future UI can render grouped review sections and approval-activation candidates without inventing local policy.
- `GET /admin/access-reviews/console` serves a small admin-owned governance console that uses the workbench, activation, and audit endpoints directly from the browser.
- `POST /admin/audit-events/query` forwards tenant-scoped audit event queries to the engine via the SDK and returns the engine's persisted audit rows unchanged, including before and after payloads for privileged control-plane changes.

## Endpoints

- `POST /admin/role-definitions`
- `PATCH /admin/role-definitions/:role_definition_id/status`
- `GET /admin/access-reviews/console`
- `POST /admin/access-reviews/findings`
- `POST /admin/access-reviews/workbench`
- `POST /admin/audit-events/query`
- `POST /admin/applications`
- `POST /admin/groups`
- `POST /admin/group-memberships`
- `POST /admin/permissions`
- `POST /admin/role-bindings`
- `PATCH /admin/role-bindings/:role_binding_id/status`
- `POST /admin/role-permissions`
- `POST /admin/deny-policies`

These routes forward the request to the engine via `@xypes-identity/sdk` and pass through deterministic SDK API errors as JSON error bodies.

## Configuration

Required environment variables:

- `ENGINE_BASE_URL`: base URL for the engine API, for example `http://localhost:3000`

Optional environment variables:

- `HOST`: defaults to `0.0.0.0`
- `PORT`: defaults to `3001`

## Setup

1. Install dependencies in this repo and in `../xypes-identity-sdk`.
2. Build the SDK dependency with `npm --prefix ../xypes-identity-sdk run build` or use this repo's build scripts.
3. Start the admin API with `npm run dev`.

## Docker local testing

From the workspace root, `docker compose up --build admin` builds `shared`, then `xypes-identity-sdk`, then this admin service inside the admin image. The Dockerfile uses `npm ci` only for repos that currently have a lockfile and falls back to `npm install` for the admin and SDK packages.

## Scripts

- `npm run build`
- `npm run typecheck`
- `npm run test`
- `npm run dev`
