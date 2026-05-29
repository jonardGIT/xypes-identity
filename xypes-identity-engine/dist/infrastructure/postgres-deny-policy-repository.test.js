import assert from "node:assert/strict";
import test from "node:test";
import { CreateDenyPolicyError } from "../domain/deny-policy-errors.js";
import { PostgresDenyPolicyRepository } from "./postgres-deny-policy-repository.js";
class RecordingTransactionClient {
    rowsByCall;
    calls = [];
    released = false;
    constructor(rowsByCall = {}) {
        this.rowsByCall = rowsByCall;
    }
    async query(queryText, values) {
        this.calls.push({ queryText, values });
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
    deny_policy: {
        deny_policy_id: "deny-1",
        tenant_id: "tenant-1",
        permission_id: "permission-1",
        subject_principal_id: null,
        subject_group_id: "group-1",
        scope_type: "application",
        scope_application_id: "application-1",
        scope_resource_type: null,
        scope_resource_id: null,
        reason: "Suspend group access",
        created_at: "2026-05-28T12:00:00.000Z",
        updated_at: "2026-05-28T12:00:00.000Z",
        created_by: "operator@example.com",
        updated_by: "operator@example.com",
    },
    audit_event_id: "audit-1",
    outbox_event_id: "outbox-1",
    actor_principal_id: "principal-operator",
    actor_subject: "operator@example.com",
    audit_reason: "Apply governance deny",
    correlation_id: "deny-1",
    reference_type: "application",
    reference_id: "application-1",
    occurred_at: "2026-05-28T12:00:00.000Z",
});
test("PostgresDenyPolicyRepository writes policy, audit, and outbox rows in one transaction", async () => {
    const client = new RecordingTransactionClient({
        2: [{ permission_id: "permission-1" }],
        3: [{ group_id: "group-1" }],
        4: [{ application_id: "application-1" }],
    });
    const repository = new PostgresDenyPolicyRepository(new RecordingTransactionPool(client));
    await repository.createDenyPolicy(createInput());
    assert.equal(client.calls.length, 8);
    assert.equal(client.calls[0]?.queryText, "BEGIN");
    assert.match(client.calls[1]?.queryText ?? "", /FROM permission/i);
    assert.match(client.calls[2]?.queryText ?? "", /FROM "group"/i);
    assert.match(client.calls[3]?.queryText ?? "", /FROM application/i);
    assert.match(client.calls[4]?.queryText ?? "", /INSERT INTO deny_policy/i);
    assert.match(client.calls[5]?.queryText ?? "", /INSERT INTO audit_event/i);
    assert.match(client.calls[6]?.queryText ?? "", /INSERT INTO outbox_event/i);
    assert.equal(client.calls[7]?.queryText, "COMMIT");
    assert.equal(client.released, true);
});
test("PostgresDenyPolicyRepository rolls back and maps missing permissions to a deterministic error", async () => {
    const client = new RecordingTransactionClient();
    const repository = new PostgresDenyPolicyRepository(new RecordingTransactionPool(client));
    await assert.rejects(repository.createDenyPolicy(createInput()), (error) => {
        assert.ok(error instanceof CreateDenyPolicyError);
        assert.equal(error.code, "DENY_POLICY_PERMISSION_NOT_FOUND");
        assert.equal(error.statusCode, 404);
        return true;
    });
    assert.equal(client.calls.length, 3);
    assert.equal(client.calls[0]?.queryText, "BEGIN");
    assert.match(client.calls[1]?.queryText ?? "", /FROM permission/i);
    assert.equal(client.calls[2]?.queryText, "ROLLBACK");
    assert.equal(client.released, true);
});
