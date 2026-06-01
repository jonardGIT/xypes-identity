# @xypes-identity/sdk

Small TypeScript SDK for the xypes-identity engine.

This package wraps the currently implemented engine endpoints with a minimal fetch-based client. It uses shared contracts from `@xypes-identity/shared` and does not import engine internals.

## Install

From this workspace:

```bash
npm install
```

The SDK depends on the local shared package at `../shared`.

## Build and test

```bash
npm run build
npm test
```

The build script compiles `../shared` first so the shared contract exports are available to the SDK. The default test script runs the TypeScript test files through `tsx`, which keeps the cross-repo example-flow coverage out of the published SDK build output while still exercising it during development.

## Sample apps

Copyable sample app entrypoints live under [`./examples`](./examples).

- [`./examples/express-route-authorization.ts`](./examples/express-route-authorization.ts) shows an Express app with explicit tenant-scoped session resolution, one protected route, startup wiring, and deny/API error handling.
- [`./examples/fastify-route-authorization.ts`](./examples/fastify-route-authorization.ts) shows the same pattern for Fastify.
- [`./examples/README.md`](./examples/README.md) explains what to copy into a consuming app and where the xypes-specific glue lives.

The documented Express and Fastify startup shapes are also mirrored by executable SDK tests in [`./test/example-flows.test.ts`](./test/example-flows.test.ts), so the sample wiring is validated alongside the lower-level middleware and authorization helpers without being bundled into the SDK package output.

If you already have an Express or Fastify app, the xypes-specific integration is under 30 lines of glue: create the client, resolve `tenant_id` and bearer token, register one authorization middleware or hook, and surface `decision_id` plus `deny_source` in your error path. The rest of the sample files is ordinary framework startup and routing.

## Safe reference integration path

For a new consumer team, the lowest-risk sequence is:

1. Generate a reviewable onboarding manifest with `npm run onboarding:seed -- ...` so tenant routing, Supabase issuer expectations, and starter permissions are written down before any control-plane mutation happens.
2. Review and edit that manifest with the application team until the `identity_bridge_mapping`, permission names, and privileged-role expectations match the real app.
3. Run `npm run onboarding:apply -- ... --dry-run` against the target engine first and resolve any manifest conflicts before removing `--dry-run`.
4. Copy one of the sample entrypoints from [`./examples`](./examples) into the consuming app and keep the safe path intact: explicit `tenant_id`, raw bearer-token forwarding to `auth.resolveSession`, and engine-backed authorization checks on protected routes.
5. Treat [`./test/example-flows.test.ts`](./test/example-flows.test.ts) as the executable reference for the expected session-then-authorization flow when adapting the sample to a real application.

This keeps onboarding state reviewable, avoids implicit tenant inference, and makes the engine decision path the source of truth from the first integration pass.

## Onboarding seed artifact

Use the checked-in template at [`./examples/onboarding-seed.template.json`](./examples/onboarding-seed.template.json) when a new application team needs a reviewable starting manifest for permissions, role definitions, and the required Supabase-project and tenant-routing decisions.

To generate a customized starter manifest from the command line:

```bash
npm run onboarding:seed -- --tenant-id tenant_123 --application-id application_billing_123 --slug billing --display-name Billing
```

Add `--supabase-project-ref`, `--supabase-jwt-issuer`, `--supabase-jwt-audience`, `--tenant-resolution-rule`, `--tenant-resolution-detail`, or `--tenant-membership-bootstrap` to override the default mapping placeholders. `--tenant-resolution-rule` must be one of `route_segment`, `trusted_subdomain`, or `dedicated_internal_header`. Add `--output ./examples/billing-onboarding-seed.json` to write the rendered manifest to disk instead of printing it to stdout.

To apply a reviewed manifest against a live engine control plane:

```bash
npm run onboarding:apply -- --base-url http://localhost:3000 --manifest ./examples/onboarding-seed.template.json --actor-subject onboarding.operator@example.test --dry-run
```

Remove `--dry-run` to create missing applications, permissions, role definitions, role-permission attachments, and to move seeded role definitions to the manifest's requested status. The apply flow is idempotent for existing applications, permissions, and role definitions, and it tolerates duplicate role-permission attachments by treating them as already present.

The apply command validates immutable state before mutating anything. If an existing application slug, permission, or role definition conflicts with the reviewed manifest, the command fails with a deterministic manifest error instead of silently drifting control-plane state. The manifest's `identity_bridge_mapping` section is captured and returned as manual follow-up guidance; it is not yet persisted by the engine because tenant and upstream-project mapping remains outside the current control-plane contract.

The recommended operator loop is seed -> review -> dry-run apply -> live apply -> copy the sample app wiring. That sequence is safer than starting from ad hoc route code because it forces tenant-routing and identity-bridge assumptions into a reviewed artifact before an application begins enforcing engine decisions.

## Usage

```ts
import {
  XypesIdentityApiError,
  createXypesIdentityClient,
  isXypesIdentityResolveSessionAvailabilityError,
  type AuthorizationCheckRequest,
  type CreateApplicationRequest,
  type ListAuditEventsRequest,
  type ListAccessReviewFindingsRequest,
} from "@xypes-identity/sdk";

const client = createXypesIdentityClient({
  baseUrl: "http://localhost:3000",
});

const session = await client.auth.resolveSession({
  token: accessToken,
  tenant_id: "tenant_123",
});

const decision = await client.authorize.check({
  tenant_id: session.principal.tenant_id,
  principal_id: session.principal.principal_id,
  application_id: "app_123",
  action: "documents.read",
  resource_type: "document",
  resource_id: "doc_123",
} satisfies AuthorizationCheckRequest);

const application = await client.controlPlane.createApplication({
  tenant_id: "tenant_123",
  slug: "hr",
  display_name: "HR",
  actor_principal_id: session.principal.principal_id,
  actor_subject: session.principal.subject,
  reason: "Initial application registration",
} satisfies CreateApplicationRequest);

const findings = await client.accessReviews.listFindings({
  tenant_id: "tenant_123",
  stale_after_days: 30,
  finding_codes: ["ORPHANED_GROUP_OWNER", "PRIVILEGED_ROLE_BINDING"],
  limit: 50,
} satisfies ListAccessReviewFindingsRequest);

const auditEvents = await client.audit.listEvents({
  tenant_id: "tenant_123",
  event_types: ["role_binding.status_updated"],
  entity_type: "role_binding",
  entity_id: "binding_123",
  limit: 25,
} satisfies ListAuditEventsRequest);

console.log(
  decision.decision_id,
  application.audit.audit_event_id,
  findings.generated_at,
  auditEvents.events[0]?.audit_event_id,
);

try {
  await client.auth.resolveSession({
    token: accessToken,
    tenant_id: "tenant_123",
  });
} catch (error) {
  if (isXypesIdentityResolveSessionAvailabilityError(error)) {
    console.error("identity bridge temporarily unavailable", error.code);
  } else if (error instanceof XypesIdentityApiError) {
    console.error(error.statusCode, error.code, error.message);
  }

  throw error;
}

await client.controlPlane.updateRoleBindingStatus({
  tenant_id: "tenant_123",
  role_binding_id: "binding_123",
  role_binding_status: "active",
  actor_principal_id: session.principal.principal_id,
  actor_subject: session.principal.subject,
  reason: "Approval completed",
});
```

## Supabase Integration Contract

Applications should treat Supabase as the identity provider and xypes-identity as the authorization system of record.

For the canonical end-to-end consumer path, tenant-selection rules, migration checklist, and failure-handling expectations, see `../docs/IDENTITY_BRIDGE_CONSUMER_GUIDE.md`.

The canonical request path is:

1. Accept the Supabase bearer token from the `Authorization` header.
2. Resolve the active tenant explicitly from request state such as a route parameter, subdomain mapping, or dedicated tenant header.
3. Send the raw bearer token and explicit `tenant_id` to `auth.resolveSession`.
4. Use the resolved principal data for `authorize.check` or the provided middleware helpers.
5. Propagate `decision_id` into logs and deny responses.

Do not parse role or group claims from the JWT and treat them as authoritative authorization data. The token carries identity context; the engine returns authorization decisions.

Recommended integration defaults:

- use short-lived access tokens with the upstream refresh flow handled server-side by your identity tier
- keep tenant context explicit on every request and never infer it from the principal alone
- do not cache authorization decisions in the application unless you also own an explicit invalidation channel
- if identity freshness cannot be established, fail closed for privileged writes and tenant-admin operations

When the upstream identity provider or JWKS endpoint is temporarily unavailable, consumer applications should not invent cached-allow behavior for sensitive actions. Any degraded behavior should be limited to explicitly approved low-risk reads with bounded TTLs and clear operator visibility.

`auth.resolveSession` callers should treat `AUTH_JWKS_UNAVAILABLE` and `AUTH_TOKEN_VERIFICATION_UNAVAILABLE` as temporary identity-bridge availability failures rather than as invalid-token or authorization-deny results.

Use `isXypesIdentityResolveSessionAvailabilityError(error)` when you need to branch on that temporary outage posture without hard-coding error-code strings.

## Middleware adapters

```ts
import {
  createExpressAuthorizationMiddleware,
  createExpressSessionMiddleware,
  createFastifyAuthorizationHook,
  createFastifySessionHook,
  type XypesIdentityRequestAuthorizationContextCarrier,
} from "@xypes-identity/sdk";

declare module "fastify" {
  interface FastifyRequest extends XypesIdentityRequestAuthorizationContextCarrier {}
}

const fastifySessionHook = createFastifySessionHook({
  client,
  resolveTenantId: (request) => request.params.tenantId,
  resolveToken: (request) =>
    request.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "",
});

fastify.addHook("preHandler", fastifySessionHook);
fastify.get(
  "/documents/:documentId",
  {
    preHandler: createFastifyAuthorizationHook({
      client,
      resolveApplicationId: () => "docs-app",
      resolveAction: () => "documents.read",
      resolveResourceType: () => "document",
      resolveResourceId: (request) => request.params.documentId,
    }),
  },
  async (request) => ({
    principal_id: request.xypesIdentity?.principal.principal_id,
    decision_id: request.xypesIdentityAuthorization?.decision_id,
  }),
);

declare global {
  namespace Express {
    interface Request extends XypesIdentityRequestAuthorizationContextCarrier {}
  }
}

app.use(
  createExpressSessionMiddleware({
    client,
    resolveTenantId: (request) => request.params.tenantId,
    resolveToken: (request) =>
      request.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "",
  }),
);

app.get(
  "/me",
  createExpressAuthorizationMiddleware({
    client,
    resolveApplicationId: () => "docs-app",
    resolveAction: () => "profile.read",
    resolveResourceType: () => "profile",
    resolveResourceId: (request) =>
      request.xypesIdentity?.principal.principal_id ?? null,
  }),
  (request, response) => {
    response.json({
      principal_id: request.xypesIdentity?.principal.principal_id,
      session_decision_id: request.xypesIdentity?.decision_id,
      authorization_decision_id:
        request.xypesIdentityAuthorization?.decision_id,
    });
  },
);
```

These helpers require an existing resolved session and always call the engine authorize API. On deny, they store the full authorization decision on `request.xypesIdentityAuthorization` and forward a `XypesIdentityAuthorizationDeniedError` that preserves `decision_id`, `reason_code`, and `deny_source` when present.

See the sample app entrypoints in [`./examples/express-route-authorization.ts`](./examples/express-route-authorization.ts) and [`./examples/fastify-route-authorization.ts`](./examples/fastify-route-authorization.ts) for a copyable startup shape, tenant resolution, and deny-aware error handling.

The SDK intentionally keeps tenant resolution and token forwarding explicit. It helps with request shaping and error handling, but it does not infer tenant context, decode token roles into policy, or hide authorization decisions behind local heuristics.

## Public API

- `createXypesIdentityClient(options)` creates the SDK client.
- `XypesIdentityClient` exposes grouped APIs:
  - `audit.listEvents`
  - `accessReviews.listFindings`
  - `auth.resolveSession`
  - `authorize.check`
  - `authorize.explain`
  - `controlPlane.createApplication`
  - `applyOnboardingManifest(options)` validates and applies a reviewed onboarding manifest over the SDK control-plane APIs.
  - `controlPlane.createGroup`
  - `controlPlane.createGroupMembership`
  - `controlPlane.createPermission`
  - `controlPlane.createRoleDefinition`
  - `controlPlane.updateRoleDefinitionStatus`
  - `controlPlane.createRoleBinding`
  - `controlPlane.updateRoleBindingStatus`
  - `controlPlane.attachRolePermission`
  - `controlPlane.createDenyPolicy`
- `createFastifySessionHook(options)` creates a Fastify-compatible session hook.
- `createExpressSessionMiddleware(options)` creates an Express-compatible session middleware.
- `authorizeRequest(request, options)` runs a single authorization check using the resolved session on the request.
- `createFastifyAuthorizationHook(options)` creates a Fastify-compatible authorization hook.
- `createExpressAuthorizationMiddleware(options)` creates an Express-compatible authorization middleware.
- `XypesIdentityApiError` is thrown for non-2xx responses.
- `XypesIdentityAuthorizationDeniedError` is thrown or forwarded when the engine returns a deny decision.

## Notes

- Tenant context remains explicit in the request types. The SDK does not infer `tenant_id`.
- The SDK does not cache authorization decisions.
- Authorization helpers do not invent local policy semantics. They enforce only what the engine returns from `authorize.check`.
- The SDK expects applications to forward the Supabase bearer token they already received rather than minting a second app-local authorization token.
- The safest failure mode for identity uncertainty is deny by default on privileged operations, with any degraded-read behavior documented separately by the consuming app.
- Shared request and response contracts are re-exported from this package.
