# Identity Bridge Consumer Guide

Canonical integration path for applications that use Supabase for identity and xypes-identity for authorization.

## Purpose

Use this guide when integrating an application with:

- `POST /v1/auth/resolve-session`
- `POST /v1/authorize/check`
- the TypeScript SDK middleware or client wrappers

This guide defines the safe default path. Applications must not treat JWT role or group claims as authoritative authorization data.

## Canonical Request Path

1. Accept the upstream bearer token from the incoming `Authorization` header.
2. Resolve the active `tenant_id` explicitly from request state such as a route parameter, subdomain mapping, or dedicated tenant header.
3. Forward the raw bearer token plus explicit `tenant_id` to `auth.resolveSession`.
4. Use the resolved principal identity for `authorize.check` or the SDK authorization middleware.
5. Enforce the engine result and propagate `decision_id` into logs, traces, and deny responses.

The application never decides access from token claims alone.

## Header And Request Conventions

- `Authorization: Bearer <supabase-access-token>` carries the raw upstream token.
- Tenant context must be explicit on every protected request.
- Prefer one stable tenant-selection convention per application surface.

Recommended tenant-selection order:

1. tenant-specific route segment such as `/tenants/:tenantId/...`
2. trusted subdomain-to-tenant mapping resolved by the application
3. dedicated header such as `x-tenant-id` when the caller is an internal service

Do not infer tenant context from `sub`, email, or other principal identity fields.

## Minimal SDK Path

```ts
import {
  XypesIdentityApiError,
  createExpressAuthorizationMiddleware,
  createExpressSessionMiddleware,
  createXypesIdentityClient,
  isXypesIdentityResolveSessionAvailabilityError,
  type XypesIdentityRequestAuthorizationContextCarrier,
} from "@xypes-identity/sdk";

declare global {
  namespace Express {
    interface Request extends XypesIdentityRequestAuthorizationContextCarrier {}
  }
}

const client = createXypesIdentityClient({
  baseUrl: process.env.XYPES_IDENTITY_BASE_URL ?? "http://localhost:3000",
});

app.use(
  createExpressSessionMiddleware({
    client,
    resolveTenantId: (request) => request.params.tenantId,
    resolveToken: (request) =>
      request.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "",
  }),
);

app.get(
  "/tenants/:tenantId/documents/:documentId",
  createExpressAuthorizationMiddleware({
    client,
    resolveApplicationId: () => "docs-app",
    resolveAction: () => "documents.read",
    resolveResourceType: () => "document",
    resolveResourceId: (request) => request.params.documentId,
  }),
  (request, response) => {
    response.json({
      principal_id: request.xypesIdentity?.principal.principal_id,
      decision_id: request.xypesIdentityAuthorization?.decision_id,
    });
  },
);

app.use((error: unknown, _request, response, _next) => {
  if (isXypesIdentityResolveSessionAvailabilityError(error)) {
    response.status(503).json({
      code: error.code,
      message: error.message,
    });
    return;
  }

  if (error instanceof XypesIdentityApiError) {
    response.status(error.statusCode).json({
      code: error.code,
      message: error.message,
    });
    return;
  }

  response.status(500).json({ code: "INTERNAL_ERROR" });
});
```

For copyable app-entrypoint shapes, see `../xypes-identity-sdk/examples/`.

## Decision And Deny Handling

- Treat `decision_id` as required traceability data for protected paths.
- Preserve deny details instead of replacing them with generic application-local errors.
- Do not hide deny precedence or rewrite `deny_source` into a less specific status.

Minimum behavior on authorization deny:

- log the `decision_id`
- include the engine reason code in operator-visible diagnostics
- return a stable application response without exposing raw internal storage details

## Resolve-Session Failure Handling

`auth.resolveSession` failure categories are not interchangeable.

- `AUTH_INVALID_TOKEN`: invalid bearer token for the configured issuer and audience
- `AUTH_TOKEN_EXPIRED`: expired bearer token
- `AUTH_TENANT_MEMBERSHIP_NOT_FOUND`: authenticated principal is not a member of the requested tenant
- `AUTH_TENANT_MEMBERSHIP_SUSPENDED`: tenant membership exists but is suspended
- `AUTH_JWKS_UNAVAILABLE`: JWKS source is temporarily unreachable or unusable
- `AUTH_TOKEN_VERIFICATION_UNAVAILABLE`: another temporary upstream verification failure

Handling rules:

- Treat the two availability errors as temporary upstream failures, not as invalid-token or deny results.
- Fail closed for privileged writes, tenant administration, billing actions, and cross-tenant operations.
- Any degraded read-only posture must be explicitly approved, bounded, and observable.

For incident diagnosis, use `./AUTH_FAILURE_RUNBOOK.md`.

## Session Refresh Expectations

- Let the identity tier own token refresh.
- Applications should forward the current bearer token they received for the request.
- If the token is expired, redirect the user or trigger the normal refresh path in the identity layer instead of inventing local authorization fallback.
- Do not cache authorization decisions across requests unless you also control explicit invalidation.

## Migration From JWT-Claim Authorization

When moving an existing app from JWT role or group checks to engine-backed authorization:

1. Stop treating JWT claims as authorization state. Use them only as identity context.
2. Add explicit tenant resolution on every protected request.
3. Introduce `auth.resolveSession` before protected routes.
4. Replace local role checks with `authorize.check` or the SDK authorization middleware.
5. Preserve and log `decision_id` on allow and deny paths.
6. Update operational docs so invalid-token, deny, and upstream-outage paths are handled separately.
7. Validate one allow case, one deny case, one missing-membership case, and one temporary outage case before enabling enforcement.

Common migration mistakes to avoid:

- mapping JWT role claims directly to application permissions
- inferring tenant from the principal alone
- swallowing deny reasons and returning a generic `403` everywhere
- treating temporary identity-bridge outages as safe cached allow results

## Validation Checklist For Consumer Teams

- protected routes forward the incoming bearer token unchanged to the SDK or engine
- tenant selection is explicit and test-covered
- application logs include upstream `decision_id` for protected requests
- deny paths preserve engine semantics and do not recreate policy logic locally
- privileged paths fail closed when session resolution or authorization freshness cannot be established

## Companion References

- `./CONSUMER_ONBOARDING_CHECKLIST.md`
- `../xypes-identity-sdk/README.md`
- `../xypes-identity-sdk/examples/README.md`
- `./AUTH_FAILURE_RUNBOOK.md`
- `./AUTH_THREAT_MODEL.md`
- `../shared/ARCHITECTURE.md`
