import assert from "node:assert/strict";
import test from "node:test";

import type { OutboxEventRecord } from "../domain/outbox-types.js";
import { getAuthorizationCacheInvalidation } from "./authorization-cache-invalidation.js";

const createOutboxEvent = (
  overrides: Partial<OutboxEventRecord> = {},
): OutboxEventRecord => ({
  outbox_event_id: "outbox-1",
  tenant_id: "tenant-1",
  topic: "authorization.control-plane",
  event_type: "role_binding.created",
  aggregate_type: "role_binding",
  aggregate_id: "aggregate-1",
  payload: {},
  headers: {},
  correlation_id: null,
  reference_type: null,
  reference_id: null,
  available_at: "2026-05-28T12:00:00.000Z",
  published_at: null,
  attempt_count: 0,
  last_error: null,
  created_at: "2026-05-28T12:00:00.000Z",
  ...overrides,
});

test("getAuthorizationCacheInvalidation bumps the decision version for control-plane mutations", () => {
  assert.deepEqual(
    getAuthorizationCacheInvalidation(createOutboxEvent()),
    {
      tenant_id: "tenant-1",
      decision_version: true,
      expansion_version: false,
    },
  );
});

test("getAuthorizationCacheInvalidation bumps both versions for group graph mutations", () => {
  assert.deepEqual(
    getAuthorizationCacheInvalidation(
      createOutboxEvent({
        event_type: "group_membership.created",
        aggregate_type: "group_membership",
      }),
    ),
    {
      tenant_id: "tenant-1",
      decision_version: true,
      expansion_version: true,
    },
  );
});

test("getAuthorizationCacheInvalidation ignores unrelated topics", () => {
  assert.equal(
    getAuthorizationCacheInvalidation(
      createOutboxEvent({
        topic: "audit.events",
      }),
    ),
    null,
  );
});