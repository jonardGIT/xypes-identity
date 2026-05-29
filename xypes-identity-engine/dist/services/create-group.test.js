import assert from "node:assert/strict";
import test from "node:test";
import { createGroup } from "./create-group.js";
class RecordingGroupRepository {
    input = null;
    async createGroup(input) {
        this.input = input;
    }
}
test("createGroup generates ids and persists an audited group", async () => {
    const repository = new RecordingGroupRepository();
    const generatedIds = ["group-1", "audit-1", "outbox-1"];
    const result = await createGroup({
        tenant_id: "tenant-1",
        scope_application_id: "application-1",
        name: "billing-admins",
        description: "Billing administrators",
        group_type: "manual",
        owner_principal_id: "principal-owner",
        scope_type: "application",
        scope_resource_type: null,
        scope_resource_id: null,
        actor_principal_id: "principal-operator",
        actor_subject: "operator@example.com",
        reason: "Create admin group",
    }, {
        groupRepository: repository,
        idGenerator: {
            nextId: () => {
                const nextId = generatedIds.shift();
                if (nextId === undefined) {
                    throw new Error("No more test ids available.");
                }
                return nextId;
            },
        },
        clock: {
            now: () => new Date("2026-05-28T12:00:00.000Z"),
        },
    });
    assert.deepEqual(result, {
        group: {
            group_id: "group-1",
            tenant_id: "tenant-1",
            scope_application_id: "application-1",
            name: "billing-admins",
            description: "Billing administrators",
            group_type: "manual",
            owner_principal_id: "principal-owner",
            scope_type: "application",
            scope_resource_type: null,
            scope_resource_id: null,
            created_at: "2026-05-28T12:00:00.000Z",
            updated_at: "2026-05-28T12:00:00.000Z",
            created_by: "operator@example.com",
            updated_by: "operator@example.com",
        },
        audit: {
            audit_event_id: "audit-1",
        },
    });
    assert.deepEqual(repository.input, {
        group: result.group,
        audit_event_id: "audit-1",
        outbox_event_id: "outbox-1",
        actor_principal_id: "principal-operator",
        actor_subject: "operator@example.com",
        reason: "Create admin group",
        correlation_id: "group-1",
        reference_type: "application",
        reference_id: "application-1",
        occurred_at: "2026-05-28T12:00:00.000Z",
    });
});
