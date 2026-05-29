# Runtime Secret Management

This document defines the default runtime secret-management posture for the xypes-identity platform and consumer applications.

## Decision

Use a managed cloud secret manager for deployed internal application secrets.

Do not store downstream application secrets in `xypes-identity`.

Keep app-local `.env` files limited to local development, short-lived preview work, or explicitly isolated non-production workflows.

## Recommended Implementation

The default implementation is:

1. store the secret in the cloud secret manager for the target environment
2. bind that secret to the application through the deployment platform
3. inject the resolved secret value into the application process at startup
4. keep the application code reading its existing environment variables through the normal config loader

This is the best fit for the current workspace because the services already load configuration from `process.env` at startup and do not yet assume any single cloud provider.

## Why This Is The Default

- It preserves the current runtime shape. Existing config loaders already validate environment variables at process startup.
- It avoids adding provider-specific SDK dependencies to every application.
- It keeps secret retrieval off the request path.
- It centralizes rotation, audit, and access control in the cloud secret manager rather than in application code.
- It avoids turning `xypes-identity` into a general secret broker, which is outside its product boundary.

## Canonical Boundary

`xypes-identity` owns:

- authorization data
- identity bridge configuration for its own runtime
- its own service secrets and connection credentials

Consumer applications own:

- their own database credentials
- third-party API keys
- storage credentials
- webhook signing secrets
- internal service tokens used only by that application or deployment slice

Consumer application secrets must not be stored in `xypes-identity`.

## Preferred Deployment Pattern

Use platform-native secret injection where the runtime platform resolves a secret-manager reference and exposes the value to the process as an environment variable.

Examples of the pattern, independent of cloud vendor:

- container platform injects a secret value as `DATABASE_URL`
- serverless platform binds a secret to `SUPABASE_JWT_ISSUER`
- VM startup or deploy automation writes the process environment from the secret manager before the service boots

The application should continue to load values through its normal config module.

## Acceptable Fallback Pattern

If the deployment platform cannot inject secrets natively, a service may fetch secrets once during startup in its composition root and map them into the same config shape that would normally come from environment variables.

Constraints for this fallback:

- fetch only at startup, not per request
- keep the provider-specific code isolated to one runtime adapter
- fail closed if required secrets cannot be resolved
- never log secret values
- preserve the same public config contract for the rest of the application

This fallback should be the exception, not the default.

## Local Development

For local development:

- use per-app `.env` files or shell environment variables
- use deterministic local defaults only where the repo already documents them
- never reuse production secret values locally

Local development is the only place where manual `.env` handling should be normal.

## Rotation And Rollout

- rotate secrets in the cloud secret manager, not in application code
- prefer deployment restart or controlled rollout after rotation unless the runtime platform supports safe live refresh
- if live refresh is required later, add it as a deliberate runtime feature with explicit testing and observability rather than as ad hoc background polling

## Anti-Patterns

Do not:

- commit secret values to the repo
- store production secrets in long-lived `.env` files on servers
- make `xypes-identity` the storage system for consumer-app secrets
- fetch secrets on the hot path
- spread provider-specific secret-manager SDK logic across route handlers or business services

## Current Platform Fit

This pattern aligns with the current codebase because these services already read runtime settings from environment variables during startup:

- `xypes-identity-engine/src/runtime-config.ts`
- `xypes-identity-admin/src/config.ts`
- `../../xypes-docman/xypes-docman-api/src/config.ts`

That means the best next implementation step is documentation and deployment standardization, not a cross-repo refactor to introduce cloud-specific secret-loading libraries.
