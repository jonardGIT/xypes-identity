import assert from "node:assert/strict";
import test from "node:test";

import type { AuditEventRecord } from "@xypes-identity/shared";

import { buildApp } from "../app.js";
import type { AuditEventRepository } from "../domain/audit-event-types.js";

class StaticAuditEventRepository implements AuditEventRepository {
  constructor(private readonly events: AuditEventRecord[]) {}

  async listEvents(): Promise<AuditEventRecord[]> {
    return this.events;
  }
}

test("POST /v1/audit-events/query returns typed audit events with tenant scoping", async (t) => {
  const app = await buildApp({
    auditRead: {
      auditEventRepository: new StaticAuditEventRepository([
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
      ]),
      clock: {
        now: () => new Date("2026-05-28T12:05:00.000Z"),
      },
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/audit-events/query",
    payload: {
      tenant_id: "tenant-1",
      event_types: ["role_binding.status_updated"],
      entity_type: "role_binding",
      entity_id: "binding-1",
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    generated_at: "2026-05-28T12:05:00.000Z",
    events: [
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
  });
});