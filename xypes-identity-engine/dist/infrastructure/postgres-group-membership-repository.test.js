import assert from "node:assert/strict";
import test from "node:test";
import { CreateGroupMembershipError } from "../domain/group-membership-errors.js";
import { PostgresGroupMembershipRepository } from "./postgres-group-membership-repository.js";
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
    group_membership: {
        group_membership_id: "membership-1",
        tenant_id: "tenant-1",
        group_id: "group-1",
        member_principal_id: "principal-1",
        member_group_id: null,
        membership_source: "manual",
        created_at: "2026-05-28T12:00:00.000Z",
        updated_at: "2026-05-28T12:00:00.000Z",
        created_by: "operator@example.com",
        updated_by: "operator@example.com",
    },
    audit_event_id: "audit-1",
    outbox_event_id: "outbox-1",
    actor_principal_id: "principal-operator",
    actor_subject: "operator@example.com",
    reason: "Add billing admin member",
    correlation_id: "membership-1",
    reference_type: "group",
    reference_id: "group-1",
    occurred_at: "2026-05-28T12:00:00.000Z",
});
test("PostgresGroupMembershipRepository writes membership, audit, and outbox rows in one transaction", async () => {
    const client = new RecordingTransactionClient(null, {
        2: [{ group_id: "group-1" }],
        3: [{ principal_id: "principal-1" }],
    });
    const repository = new PostgresGroupMembershipRepository(new RecordingTransactionPool(client));
    await repository.createGroupMembership(createInput());
    assert.equal(client.calls.length, 7);
    assert.equal(client.calls[0]?.queryText, "BEGIN");
    assert.match(client.calls[1]?.queryText ?? "", /FROM "group"/i);
    assert.match(client.calls[2]?.queryText ?? "", /FROM principal/i);
    assert.match(client.calls[3]?.queryText ?? "", /INSERT INTO group_membership/i);
    assert.match(client.calls[4]?.queryText ?? "", /INSERT INTO audit_event/i);
    assert.match(client.calls[5]?.queryText ?? "", /INSERT INTO outbox_event/i);
    assert.equal(client.calls[6]?.queryText, "COMMIT");
    assert.equal(client.released, true);
});
test("PostgresGroupMembershipRepository rejects nested-group cycles and rolls back", async () => {
    const nestedGroupInput = {
        ...createInput(),
        group_membership: {
            ...createInput().group_membership,
            member_principal_id: null,
            member_group_id: "group-2",
        },
    };
    const client = new RecordingTransactionClient(null, {
        2: [{ group_id: "group-1" }],
        3: [{ group_id: "group-2" }],
        4: [{ group_id: "group-1" }],
    });
    const repository = new PostgresGroupMembershipRepository(new RecordingTransactionPool(client));
    await assert.rejects(repository.createGroupMembership(nestedGroupInput), (error) => {
        assert.ok(error instanceof CreateGroupMembershipError);
        assert.equal(error.code, "GROUP_MEMBERSHIP_CYCLE_DETECTED");
        assert.equal(error.statusCode, 400);
        return true;
    });
    assert.equal(client.calls.length, 5);
    assert.equal(client.calls[0]?.queryText, "BEGIN");
    assert.match(client.calls[1]?.queryText ?? "", /FROM "group"/i);
    assert.match(client.calls[2]?.queryText ?? "", /FROM "group"/i);
    assert.match(client.calls[3]?.queryText ?? "", /WITH RECURSIVE containing_groups/i);
    assert.equal(client.calls[4]?.queryText, "ROLLBACK");
    assert.equal(client.released, true);
});
test("PostgresGroupMembershipRepository rolls back when the membership insert fails", async () => {
    const insertError = new Error("insert failed");
    const client = new RecordingTransactionClient({
        atCall: 4,
        error: insertError,
    }, {
        2: [{ group_id: "group-1" }],
        3: [{ principal_id: "principal-1" }],
    });
    const repository = new PostgresGroupMembershipRepository(new RecordingTransactionPool(client));
    await assert.rejects(repository.createGroupMembership(createInput()), insertError);
    assert.equal(client.calls.length, 5);
    assert.equal(client.calls[0]?.queryText, "BEGIN");
    assert.match(client.calls[3]?.queryText ?? "", /INSERT INTO group_membership/i);
    assert.equal(client.calls[4]?.queryText, "ROLLBACK");
    assert.equal(client.released, true);
});
