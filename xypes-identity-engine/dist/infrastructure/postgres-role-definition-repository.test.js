import assert from "node:assert/strict";
import test from "node:test";
import { CreateRoleDefinitionError, UpdateRoleDefinitionStatusError } from "../domain/role-definition-errors.js";
import { PostgresRoleDefinitionRepository } from "./postgres-role-definition-repository.js";
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
    role_definition: {
        role_definition_id: "role-1",
        tenant_id: "tenant-1",
        application_id: "application-1",
        name: "billing-admin",
        description: "Can manage billing settings",
        status: "draft",
        approval_required: false,
        created_at: "2026-05-28T12:00:00.000Z",
        updated_at: "2026-05-28T12:00:00.000Z",
        created_by: "operator@example.com",
        updated_by: "operator@example.com",
    },
    audit_event_id: "audit-1",
    outbox_event_id: "outbox-1",
    actor_principal_id: "principal-1",
    actor_subject: "operator@example.com",
    reason: "Initial bootstrap role",
    correlation_id: "role-1",
    reference_type: "application",
    reference_id: "application-1",
    occurred_at: "2026-05-28T12:00:00.000Z",
});
test("PostgresRoleDefinitionRepository writes role, audit, and outbox rows in one transaction", async () => {
    const client = new RecordingTransactionClient();
    const repository = new PostgresRoleDefinitionRepository(new RecordingTransactionPool(client));
    await repository.createRoleDefinition(createInput());
    assert.equal(client.calls.length, 5);
    assert.equal(client.calls[0]?.queryText, "BEGIN");
    assert.match(client.calls[1]?.queryText ?? "", /INSERT INTO role_definition/i);
    assert.match(client.calls[2]?.queryText ?? "", /INSERT INTO audit_event/i);
    assert.match(client.calls[3]?.queryText ?? "", /INSERT INTO outbox_event/i);
    assert.equal(client.calls[4]?.queryText, "COMMIT");
    assert.equal(client.released, true);
});
test("PostgresRoleDefinitionRepository rolls back and maps duplicate names to a deterministic error", async () => {
    const duplicateNameError = Object.assign(new Error("duplicate key value"), {
        code: "23505",
        constraint: "role_definition_tenant_id_application_id_name_key",
    });
    const client = new RecordingTransactionClient({
        atCall: 2,
        error: duplicateNameError,
    });
    const repository = new PostgresRoleDefinitionRepository(new RecordingTransactionPool(client));
    await assert.rejects(repository.createRoleDefinition(createInput()), (error) => {
        assert.ok(error instanceof CreateRoleDefinitionError);
        assert.equal(error.code, "ROLE_DEFINITION_DUPLICATE_NAME");
        assert.equal(error.statusCode, 409);
        return true;
    });
    assert.equal(client.calls.length, 3);
    assert.equal(client.calls[0]?.queryText, "BEGIN");
    assert.match(client.calls[1]?.queryText ?? "", /INSERT INTO role_definition/i);
    assert.equal(client.calls[2]?.queryText, "ROLLBACK");
    assert.equal(client.released, true);
});
test("PostgresRoleDefinitionRepository updates status with before and after payloads in one transaction", async () => {
    const client = new RecordingTransactionClient(null, {
        2: [
            {
                role_definition_id: "role-1",
                tenant_id: "tenant-1",
                application_id: "application-1",
                name: "billing-admin",
                description: "Can manage billing settings",
                status: "draft",
                approval_required: false,
                created_at: "2026-05-20T08:00:00.000Z",
                updated_at: "2026-05-20T08:00:00.000Z",
                created_by: "bootstrap@example.com",
                updated_by: "bootstrap@example.com",
            },
        ],
    });
    const repository = new PostgresRoleDefinitionRepository(new RecordingTransactionPool(client));
    const result = await repository.updateRoleDefinitionStatus({
        tenant_id: "tenant-1",
        role_definition_id: "role-1",
        status: "active",
        audit_event_id: "audit-1",
        outbox_event_id: "outbox-1",
        actor_principal_id: "principal-1",
        actor_subject: "operator@example.com",
        reason: "Ready for assignment",
        correlation_id: "role-1",
        occurred_at: "2026-05-28T16:00:00.000Z",
    });
    assert.deepEqual(result, {
        role_definition_id: "role-1",
        tenant_id: "tenant-1",
        application_id: "application-1",
        name: "billing-admin",
        description: "Can manage billing settings",
        status: "active",
        approval_required: false,
        created_at: "2026-05-20T08:00:00.000Z",
        updated_at: "2026-05-28T16:00:00.000Z",
        created_by: "bootstrap@example.com",
        updated_by: "operator@example.com",
    });
    assert.equal(client.calls.length, 6);
    assert.equal(client.calls[0]?.queryText, "BEGIN");
    assert.match(client.calls[1]?.queryText ?? "", /SELECT/i);
    assert.match(client.calls[2]?.queryText ?? "", /UPDATE role_definition/i);
    assert.match(client.calls[3]?.queryText ?? "", /INSERT INTO audit_event/i);
    assert.match(client.calls[4]?.queryText ?? "", /INSERT INTO outbox_event/i);
    assert.equal(client.calls[5]?.queryText, "COMMIT");
    const auditBefore = JSON.parse(String(client.calls[3]?.values[8]));
    const auditAfter = JSON.parse(String(client.calls[3]?.values[9]));
    const outboxPayload = JSON.parse(String(client.calls[4]?.values[6]));
    assert.equal(auditBefore.status, "draft");
    assert.equal(auditAfter.status, "active");
    assert.deepEqual(outboxPayload.before, auditBefore);
    assert.deepEqual(outboxPayload.after, auditAfter);
    assert.equal(client.released, true);
});
test("PostgresRoleDefinitionRepository rolls back when the role definition does not exist", async () => {
    const client = new RecordingTransactionClient();
    const repository = new PostgresRoleDefinitionRepository(new RecordingTransactionPool(client));
    await assert.rejects(repository.updateRoleDefinitionStatus({
        tenant_id: "tenant-1",
        role_definition_id: "role-missing",
        status: "retired",
        audit_event_id: "audit-1",
        outbox_event_id: "outbox-1",
        actor_principal_id: null,
        actor_subject: "operator@example.com",
        reason: "Cleanup",
        correlation_id: "role-missing",
        occurred_at: "2026-05-28T16:00:00.000Z",
    }), (error) => {
        assert.ok(error instanceof UpdateRoleDefinitionStatusError);
        assert.equal(error.code, "ROLE_DEFINITION_NOT_FOUND");
        assert.equal(error.statusCode, 404);
        return true;
    });
    assert.equal(client.calls.length, 3);
    assert.equal(client.calls[0]?.queryText, "BEGIN");
    assert.match(client.calls[1]?.queryText ?? "", /SELECT/i);
    assert.equal(client.calls[2]?.queryText, "ROLLBACK");
    assert.equal(client.released, true);
});
