import assert from "node:assert/strict";
import test from "node:test";
import { CreateGroupError } from "../domain/group-errors.js";
import { PostgresGroupRepository } from "./postgres-group-repository.js";
class RecordingTransactionClient {
    failure;
    rowsByCall;
    calls = [];
    released = false;
    constructor(failure = null, rowsByCall = {}) {
        this.failure = failure;
        this.rowsByCall = rowsByCall;
    }
    async query(queryText, values) {
        this.calls.push({ queryText, values });
        if (this.failure !== null && this.calls.length === this.failure.atCall) {
            throw this.failure.error;
        }
        const rows = this.rowsByCall[this.calls.length];
        return { rows: (rows ?? []) };
    }
    release() {
        this.released = true;
    }
}
class RecordingTransactionPool {
    client;
    connectCalls = 0;
    constructor(client) {
        this.client = client;
    }
    async connect() {
        this.connectCalls += 1;
        return this.client;
    }
}
const createInput = () => ({
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
test("PostgresGroupRepository writes group, audit, and outbox rows in one transaction", async () => {
    const client = new RecordingTransactionClient(null, {
        2: [],
        3: [{ principal_id: "principal-owner" }],
        4: [{ application_id: "application-1" }],
    });
    const repository = new PostgresGroupRepository(new RecordingTransactionPool(client));
    await repository.createGroup(createInput());
    assert.equal(client.calls.length, 8);
    assert.equal(client.calls[0]?.queryText, "BEGIN");
    assert.match(client.calls[1]?.queryText ?? "", /FROM "group"/i);
    assert.match(client.calls[2]?.queryText ?? "", /FROM principal/i);
    assert.match(client.calls[3]?.queryText ?? "", /FROM application/i);
    assert.match(client.calls[4]?.queryText ?? "", /INSERT INTO "group"/i);
    assert.match(client.calls[5]?.queryText ?? "", /INSERT INTO audit_event/i);
    assert.match(client.calls[6]?.queryText ?? "", /INSERT INTO outbox_event/i);
    assert.equal(client.calls[7]?.queryText, "COMMIT");
    assert.equal(client.released, true);
});
test("PostgresGroupRepository rolls back and maps duplicate names to a deterministic error", async () => {
    const duplicateNameError = Object.assign(new Error("duplicate key value"), {
        code: "23505",
        constraint: "group_tenant_id_name_key",
    });
    const client = new RecordingTransactionClient({
        atCall: 5,
        error: duplicateNameError,
    }, {
        2: [],
        3: [{ principal_id: "principal-owner" }],
        4: [{ application_id: "application-1" }],
    });
    const repository = new PostgresGroupRepository(new RecordingTransactionPool(client));
    await assert.rejects(repository.createGroup(createInput()), (error) => {
        assert.ok(error instanceof CreateGroupError);
        assert.equal(error.code, "GROUP_DUPLICATE_NAME");
        assert.equal(error.statusCode, 409);
        return true;
    });
    assert.equal(client.calls.length, 6);
    assert.equal(client.calls[0]?.queryText, "BEGIN");
    assert.match(client.calls[1]?.queryText ?? "", /FROM "group"/i);
    assert.match(client.calls[4]?.queryText ?? "", /INSERT INTO "group"/i);
    assert.equal(client.calls[5]?.queryText, "ROLLBACK");
    assert.equal(client.released, true);
});
