import assert from "node:assert/strict";
import test from "node:test";
import { CreatePermissionError } from "../domain/permission-errors.js";
import { PostgresPermissionRepository } from "./postgres-permission-repository.js";
class RecordingTransactionClient {
    failure;
    calls = [];
    released = false;
    constructor(failure = null) {
        this.failure = failure;
    }
    async query(queryText, values) {
        this.calls.push({ queryText, values });
        if (this.failure !== null && this.calls.length === this.failure.atCall) {
            throw this.failure.error;
        }
        return { rows: [] };
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
    permission: {
        permission_id: "permission-1",
        tenant_id: "tenant-1",
        application_id: "application-1",
        action: "invoice.read",
        resource_type: "invoice",
        description: "Read invoice records",
        created_at: "2026-05-28T12:00:00.000Z",
        updated_at: "2026-05-28T12:00:00.000Z",
        created_by: "operator@example.com",
        updated_by: "operator@example.com",
    },
    audit_event_id: "audit-1",
    outbox_event_id: "outbox-1",
    actor_principal_id: "principal-1",
    actor_subject: "operator@example.com",
    reason: "Bootstrap permission catalog",
    correlation_id: "permission-1",
    reference_type: "application",
    reference_id: "application-1",
    occurred_at: "2026-05-28T12:00:00.000Z",
});
test("PostgresPermissionRepository writes permission, audit, and outbox rows in one transaction", async () => {
    const client = new RecordingTransactionClient();
    const repository = new PostgresPermissionRepository(new RecordingTransactionPool(client));
    await repository.createPermission(createInput());
    assert.equal(client.calls.length, 5);
    assert.equal(client.calls[0]?.queryText, "BEGIN");
    assert.match(client.calls[1]?.queryText ?? "", /INSERT INTO permission/i);
    assert.match(client.calls[2]?.queryText ?? "", /INSERT INTO audit_event/i);
    assert.match(client.calls[3]?.queryText ?? "", /INSERT INTO outbox_event/i);
    assert.equal(client.calls[4]?.queryText, "COMMIT");
    assert.equal(client.released, true);
});
test("PostgresPermissionRepository rolls back and maps duplicate permissions to a deterministic error", async () => {
    const duplicatePermissionError = Object.assign(new Error("duplicate key value"), {
        code: "23505",
        constraint: "permission_tenant_id_application_id_action_resource_type_key",
    });
    const client = new RecordingTransactionClient({
        atCall: 2,
        error: duplicatePermissionError,
    });
    const repository = new PostgresPermissionRepository(new RecordingTransactionPool(client));
    await assert.rejects(repository.createPermission(createInput()), (error) => {
        assert.ok(error instanceof CreatePermissionError);
        assert.equal(error.code, "PERMISSION_DUPLICATE");
        assert.equal(error.statusCode, 409);
        return true;
    });
    assert.equal(client.calls.length, 3);
    assert.equal(client.calls[0]?.queryText, "BEGIN");
    assert.match(client.calls[1]?.queryText ?? "", /INSERT INTO permission/i);
    assert.equal(client.calls[2]?.queryText, "ROLLBACK");
    assert.equal(client.released, true);
});
test("PostgresPermissionRepository rolls back and maps missing applications to a deterministic error", async () => {
    const missingApplicationError = Object.assign(new Error("insert or update on table permission violates foreign key"), {
        code: "23503",
        constraint: "permission_tenant_id_application_id_fkey",
    });
    const client = new RecordingTransactionClient({
        atCall: 2,
        error: missingApplicationError,
    });
    const repository = new PostgresPermissionRepository(new RecordingTransactionPool(client));
    await assert.rejects(repository.createPermission(createInput()), (error) => {
        assert.ok(error instanceof CreatePermissionError);
        assert.equal(error.code, "PERMISSION_APPLICATION_NOT_FOUND");
        assert.equal(error.statusCode, 404);
        return true;
    });
    assert.equal(client.calls.length, 3);
    assert.equal(client.calls[0]?.queryText, "BEGIN");
    assert.match(client.calls[1]?.queryText ?? "", /INSERT INTO permission/i);
    assert.equal(client.calls[2]?.queryText, "ROLLBACK");
    assert.equal(client.released, true);
});
