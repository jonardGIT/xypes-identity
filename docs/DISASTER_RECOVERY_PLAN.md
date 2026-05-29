# xypes-identity Disaster Recovery Plan

## Scope

This runbook covers recovery of the current xypes-identity platform:

- Postgres as the source of truth for authorization, governance, audit, and outbox state
- Redis as cache and invalidation version state only
- xypes-identity-engine HTTP and worker processes
- xypes-identity-admin and xypes-identity-sdk as rebuildable integration layers

Out of scope:

- infrastructure provisioning patterns not defined in this repo
- Supabase operational recovery
- regional failover designs that are not implemented in this workspace

## Recovery Objectives And Assumptions

- Restore authorization correctness before performance.
- Postgres recovery point defines the recovered authorization state.
- Redis may be restored empty without data loss.
- The worker rebuilds invalidation state by replaying outbox-backed effects from Postgres.
- Admin and SDK layers do not hold authoritative authorization state.

Exercise status:

- Documentation and tabletop complete.
- A live non-production restore drill has not yet been executed from this repo.
- The checked-in placeholder record at `./drills/PENDING_NON_PRODUCTION_RESTORE_DRILL.md` reserves the evidence format, but it is intentionally marked pending until a real drill is run.

## Backup Vs Rebuild

Must be backed up:

- Postgres data volume
- authorization tables and related directory data
- audit_event rows
- outbox_event rows
- deployment configuration required to reconnect engine, worker, Redis, and Supabase JWT settings

May be rebuilt:

- Redis cache entries and tenant version keys
- engine server process
- engine worker process
- admin service
- SDK build artifacts and consuming app deployments

## Restore Sequence

1. Freeze writes.
   Stop the admin service, engine HTTP service, and engine worker before restore so new mutations and replay activity do not race the recovery point.
2. Restore Postgres.
   Recover the engine database from the latest valid backup or point-in-time target, including authorization, audit, access review, and outbox tables.
3. Reset Redis.
   Start Redis empty or flush stale keys. Do not treat Redis as authoritative.
4. Start the engine HTTP service.
   Verify it can connect to restored Postgres, Redis, and Supabase JWKS settings.
5. Start the engine worker.
   Allow the worker to drain pending outbox rows and rebuild cache invalidation state.
6. Start admin and dependent integrations.
   Re-enable admin and SDK-backed callers only after engine reads and replay behavior are healthy.

## Responsibilities

- Database owner: restore Postgres and confirm the intended recovery point.
- Engine owner: restore engine services, verify decision paths, and monitor worker replay.
- Platform operator: reset Redis and confirm cache recovery is happening from live traffic and replay.
- Admin owner: verify governance flows against restored engine state.
- SDK and application owners: run integration smoke tests once engine recovery is complete.

## Validation Checklist

- Engine server starts successfully with restored DATABASE_URL and REDIS_URL.
- Engine worker starts and continues polling without repeated batch failures.
- Expected authorization, audit, access review, and outbox rows exist after restore.
- authorize.check returns a decision_id for a known allow case and a known deny case.
- authorize.explain returns deterministic trace data from restored state.
- A new control-plane mutation writes both audit and outbox records.
- The worker processes that outbox work and cache version state advances.
- Admin can proxy control-plane and access-review requests successfully.
- At least one SDK-integrated path completes resolve-session plus authorize.check end to end.

## Current Status

- The recovery procedure is now documented.
- This requirement is not operationally complete until a live non-production restore drill is executed and recorded with observed restore time, replay behavior, and follow-up actions.

## Expected Drill Evidence Record

When the first live non-production drill is executed, capture at least:

- drill date, environment, and participating owners
- restore start time, restore completion time, and total time to first healthy authorize check
- observed worker replay duration and whether cache version advancement resumed cleanly
- validation checklist results, including admin proxy and one SDK-backed end-to-end path
- gaps, corrective actions, and the target date for the next drill

Use `./drills/PENDING_NON_PRODUCTION_RESTORE_DRILL.md` as the checked-in record shell and replace its pending status only with observed evidence from a real non-production drill.
