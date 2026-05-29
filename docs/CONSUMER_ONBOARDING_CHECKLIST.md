# Consumer Onboarding Checklist

Repeatable onboarding path for a consumer application integrating Supabase-backed identity with xypes-identity authorization.

Use this checklist with `./IDENTITY_BRIDGE_CONSUMER_GUIDE.md`.

## What This Covers

- greenfield application onboarding
- migration from JWT-claim authorization to engine-backed authorization
- application, permission, role, and binding setup expectations
- tenant mapping expectations for a new Supabase-backed application
- minimum validation required before enabling enforcement for a tenant

This document is a guide, not an automation system. Until onboarding automation exists, teams should treat these steps as the required manual baseline.

## Preconditions

Before onboarding a consumer application, confirm:

- the target tenant already exists in the platform operating model
- the application has a stable tenant-selection convention
- the application forwards upstream bearer tokens to its server or trusted backend
- the team knows which routes or operations must be protected first
- non-production access to the engine is available for validation

## Greenfield Onboarding Path

### 1. Register The Application

Create one tenant-scoped application record in xypes-identity.

Minimum decisions to make first:

- application slug
- human-readable display name
- initial protected resource types
- initial permission names by action boundary

Keep permission names action-oriented and stable, for example:

- `documents.read`
- `documents.write`
- `documents.approve`
- `billing.invoice.read`

Do not encode tenant ids, user ids, or environment names into permission names.

### 2. Seed Permissions

Create the minimum permission set required for the first protected routes.

Start with the smallest set that supports:

- one allow path
- one deny path
- one privileged path if the application has privileged actions

Avoid seeding speculative permissions for features that are not shipping yet.

### 3. Define Roles

Create role definitions that group permissions by responsibility, not by UI page.

Recommended role-shape rules:

- keep roles understandable by operators
- separate read-only roles from mutation roles
- use `approval_required` for privileged roles that should begin as `eligible`
- avoid creating one role per user or one role per route

### 4. Attach Permissions To Roles

For each role definition:

- attach only the permissions the role actually needs
- review whether any permission implies privileged or tenant-admin behavior
- confirm that mutation privileges are not being mixed casually into broad reader roles

### 5. Create Initial Bindings

Create the minimum role bindings needed for validation.

Preferred first bindings:

- one known allow subject
- one known deny subject
- one privileged subject only if the workflow already needs privileged testing

If a role requires approval, bind it as `eligible` first and validate the later activation path separately.

## Supabase Project And Tenant Mapping

Each consumer team must define how a Supabase-backed application maps identity traffic into xypes-identity tenant-aware authorization.

Minimum mapping decisions:

- which Supabase project issues the bearer tokens
- which issuer and audience values the engine expects for that environment
- how the application resolves `tenant_id` on each protected request
- how application principals are expected to gain tenant membership

Rules:

- tenant context must be explicit per request
- tenant context must not be inferred from JWT subject or email
- JWT claims remain identity context only, not authorization state
- the same request path must work for allow, deny, and missing-membership cases

Document the concrete tenant-resolution rule the app uses:

1. route segment
2. trusted subdomain mapping
3. dedicated internal header

If the application uses more than one rule, document precedence and test each one.

## Integration Steps In The Consumer App

1. Add the SDK client or direct engine client configuration.
2. Forward the incoming `Authorization` bearer token unchanged.
3. Resolve `tenant_id` explicitly before protected handlers run.
4. Call `auth.resolveSession` for protected requests.
5. Use `authorize.check` or SDK authorization middleware for protected operations.
6. Preserve `decision_id` in logs and deny or operator-visible error paths.
7. Treat resolve-session availability failures separately from invalid-token and deny results.

Use `./IDENTITY_BRIDGE_CONSUMER_GUIDE.md` for the canonical request path and error taxonomy.

## Migration Checklist For Existing Apps

When migrating from local JWT-claim authorization:

1. Inventory the routes that currently branch on JWT roles, groups, or app metadata.
2. Replace those branches with explicit permissions and roles in xypes-identity.
3. Introduce explicit tenant resolution for every protected request.
4. Add `auth.resolveSession` before existing protected handlers.
5. Replace local claim checks with `authorize.check` or SDK middleware.
6. Preserve `decision_id`, `reason_code`, and deny posture in logs and diagnostics.
7. Remove any fallback that treats stale cached claims as current authorization.
8. Verify one allow, one deny, one suspended or missing-membership, and one temporary outage path before tenant enforcement begins.

## Minimum Pre-Enforcement Validation

Before enabling enforcement for a tenant, confirm all of the following in non-production:

- a valid bearer token resolves to the expected principal and active tenant membership
- a known allowed request returns the expected allow outcome
- a known denied request returns deny without local override
- a missing-membership or suspended-membership request fails deterministically
- a temporary resolve-session availability failure is surfaced as an outage path, not as an allow or generic deny
- application logs include `decision_id` for protected requests
- privileged writes fail closed when identity freshness cannot be established

Evidence that should exist before enabling enforcement:

- example request or automated test for one allow path
- example request or automated test for one deny path
- example request or automated test for one tenant-membership failure path
- evidence that the app surfaces or records `decision_id`

## Suggested First Protected Slice

For a new consumer application, start with:

- one read-only route
- one mutation route
- one operator or privileged route if applicable

This keeps the first integration small enough to validate without forcing the team to model its entire product before proving the path works.

## Common Onboarding Mistakes

- copying JWT roles directly into application authorization branches
- inferring tenant from the principal instead of request state
- seeding too many permissions up front without a real protected-path need
- creating roles that mirror UI menus instead of business responsibilities
- hiding deny details and losing `decision_id` traceability
- treating temporary bridge outages as acceptable cached allow results for sensitive actions

## Current Manual Baseline

Until onboarding automation is delivered, the minimum manual artifact set for a new consumer team is:

- documented application slug and protected resource model
- seeded permissions for the first protected slice
- seeded role definitions and attached permissions
- at least one validation binding for allow and deny behavior
- written tenant-resolution rule
- non-production validation evidence for allow, deny, membership failure, and outage handling

## Companion References

- `./IDENTITY_BRIDGE_CONSUMER_GUIDE.md`
- `./AUTH_FAILURE_RUNBOOK.md`
- `./STAGING_GATE.md`
- `../xypes-identity-sdk/README.md`
