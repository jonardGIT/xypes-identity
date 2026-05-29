# SDK sample apps

These files are meant to be copied as app entrypoint patterns, not read as isolated route snippets.

## What each sample shows

- explicit `tenant_id` resolution on every request
- bearer token extraction for `auth.resolveSession`
- a single protected route that delegates authorization to the engine
- deny handling that preserves `decision_id`, `reason_code`, and `deny_source`
- ordinary framework startup so the file feels like an actual app

## Files

- [`./express-route-authorization.ts`](./express-route-authorization.ts): Express entrypoint with tenant-scoped session middleware and a protected invoice route.
- [`./fastify-route-authorization.ts`](./fastify-route-authorization.ts): Fastify entrypoint with the same flow using hooks.

## Under-30-lines of glue

If your app already exists, the xypes-specific wiring stays small:

1. Create the SDK client.
2. Resolve `tenant_id` and bearer token explicitly.
3. Add one authorization middleware or hook for the protected route.
4. Return the engine's `decision_id` and deny details from your error path.

Everything else in these files is normal Express or Fastify setup that you can adapt to your app structure.

## Runtime notes

- Set `XYPES_IDENTITY_BASE_URL` when the engine is not running on `http://localhost:3000`.
- Set `PORT` if you do not want the sample app to listen on `4000`.
- Install the framework package in the consuming app (`express` or `fastify`) because these examples live alongside the SDK source and are not bundled into the SDK package itself.

## Integration rules these samples assume

- Forward the incoming Supabase bearer token to `auth.resolveSession`; do not derive authorization from JWT role or group claims in the app.
- Resolve tenant context explicitly on every request from a route parameter, subdomain map, or dedicated header.
- Treat the engine response as the source of truth for authorization and propagate `decision_id` into logs or error responses.
- For privileged writes or tenant-admin operations, fail closed if the app cannot establish identity freshness or receive an engine decision.
- If a product chooses a degraded read-only mode during an upstream identity outage, keep it bounded, documented, and separate from privileged actions.

The same startup patterns are mirrored by executable SDK tests in [`../test/example-flows.test.ts`](../test/example-flows.test.ts), which validate session resolution followed by authorization on representative Express and Fastify request shapes during SDK development without shipping those test fixtures in the package output.
