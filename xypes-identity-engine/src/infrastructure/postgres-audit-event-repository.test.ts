import assert from "node:assert/strict";
import test from "node:test";

import { PostgresAuditEventRepository } from "./postgres-audit-event-repository.js";

class RecordingPool {
  readonly calls: Array<{ queryText: string; values: readonly unknown[] }> = [];

  constructor(
    private readonly responses: Array<{ rows: Array<Record<string, unknown>> }>,
  ) {}

  async query<Row extends { [key: string]: unknown }>(
    queryText: string,
    values: readonly unknown[],
  ): Promise<{ rows: Row[] }> {
    this.calls.push({ queryText, values });

    const response = this.responses.shift() ?? { rows: [] };

    return { rows: response.rows as Row[] };
  }
}

test("PostgresAuditEventRepository maps audit rows and applies the requested filters", async () => {
  const pool = new RecordingPool([
    {
      rows: [
        {
          audit_event_id: "audit-1",
          tenant_id: "tenant-1",
          event_type: "role_binding.status_updated",
          entity_type: "role_binding",
          entity_id: "binding-1",
          actor_principal_id: null,
          actor_subject: "approver@example.com",
          reason: "Approval completed",
          before_payload: { role_binding_status: "eligible" },
          after_payload: { role_binding_status: "active" },
          correlation_id: "binding-1",
          reference_type: "role_definition",
          reference_id: "role-1",
          occurred_at: "2026-05-28T12:00:00.000Z",
        },
      ],
    },
  ]);
  const repository = new PostgresAuditEventRepository(pool);

  const events = await repository.listEvents({
    tenant_id: "tenant-1",
    limit: 25,
    event_types: ["role_binding.status_updated"],
    entity_type: "role_binding",
    entity_id: "binding-1",
    actor_subject: "approver@example.com",
    correlation_id: "binding-1",
    reference_type: "role_definition",
    reference_id: "role-1",
    occurred_after: "2026-05-01T00:00:00.000Z",
  });

  assert.equal(events.length, 1);
  assert.equal(events[0]?.event_type, "role_binding.status_updated");
  assert.deepEqual(pool.calls[0]?.values, [
    "tenant-1",
    ["role_binding.status_updated"],
    "role_binding",
    "binding-1",
    "approver@example.com",
    "binding-1",
    "role_definition",
    "role-1",
    "2026-05-01T00:00:00.000Z",
    25,
  ]);
  assert.match(pool.calls[0]?.queryText ?? "", /FROM audit_event AS ae/i);
  assert.match(pool.calls[0]?.queryText ?? "", /ae\.event_type = ANY/i);
  assert.match(pool.calls[0]?.queryText ?? "", /ORDER BY ae\.occurred_at DESC/i);
});