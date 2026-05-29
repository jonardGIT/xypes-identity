import assert from "node:assert/strict";
import test from "node:test";
import { LoggerAuditPublisher } from "./logger-audit-publisher.js";
test("LoggerAuditPublisher writes the audit event through the provided logger", async () => {
    const entries = [];
    const publisher = new LoggerAuditPublisher({
        info: (bindings, message) => {
            entries.push({ bindings, message });
        },
    });
    await publisher.publish({
        event_type: "principal.resolved",
        decision_id: "decision-123",
        principal_id: "principal-1",
        tenant_id: "tenant-1",
        subject: "supabase-user-1",
        occurred_at: "2026-05-27T00:00:00.000Z",
    });
    assert.deepEqual(entries, [
        {
            bindings: {
                audit_event: {
                    event_type: "principal.resolved",
                    decision_id: "decision-123",
                    principal_id: "principal-1",
                    tenant_id: "tenant-1",
                    subject: "supabase-user-1",
                    occurred_at: "2026-05-27T00:00:00.000Z",
                },
            },
            message: "Published audit event.",
        },
    ]);
});
