import assert from "node:assert/strict";
import test from "node:test";
import { listAuditEvents } from "./list-audit-events.js";
class RecordingAuditEventRepository {
    events;
    input = null;
    constructor(events) {
        this.events = events;
    }
    async listEvents(input) {
        this.input = input;
        return this.events;
    }
}
test("listAuditEvents normalizes event types and applies the default limit", async () => {
    const repository = new RecordingAuditEventRepository([]);
    const response = await listAuditEvents({
        tenant_id: "tenant-1",
        event_types: ["role_binding.created", "role_binding.created", "role_binding.status_updated"],
        entity_type: "role_binding",
        entity_id: "binding-1",
    }, {
        auditEventRepository: repository,
        clock: {
            now: () => new Date("2026-05-28T12:00:00.000Z"),
        },
    });
    assert.equal(response.generated_at, "2026-05-28T12:00:00.000Z");
    assert.deepEqual(repository.input, {
        tenant_id: "tenant-1",
        limit: 100,
        event_types: ["role_binding.created", "role_binding.status_updated"],
        entity_type: "role_binding",
        entity_id: "binding-1",
        actor_subject: undefined,
        correlation_id: undefined,
        reference_type: undefined,
        reference_id: undefined,
        occurred_after: undefined,
    });
});
test("listAuditEvents returns repository events unchanged", async () => {
    const repository = new RecordingAuditEventRepository([
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
    ]);
    const response = await listAuditEvents({
        tenant_id: "tenant-1",
        limit: 10,
    }, {
        auditEventRepository: repository,
        clock: {
            now: () => new Date("2026-05-28T12:05:00.000Z"),
        },
    });
    assert.equal(response.events.length, 1);
    assert.equal(response.events[0]?.event_type, "role_binding.status_updated");
    assert.equal(response.events[0]?.actor_subject, "approver@example.com");
});
