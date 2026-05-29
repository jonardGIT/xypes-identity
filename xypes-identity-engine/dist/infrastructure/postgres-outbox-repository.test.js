import assert from "node:assert/strict";
import test from "node:test";
import { PostgresOutboxRepository } from "./postgres-outbox-repository.js";
class RecordingQueryClient {
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
class RecordingQueryPool {
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
test("PostgresOutboxRepository claims available events with a lease in one statement", async () => {
    const client = new RecordingQueryClient({
        1: [
            {
                outbox_event_id: "outbox-1",
                tenant_id: "tenant-1",
                topic: "authorization.control-plane",
                event_type: "role_binding.created",
                aggregate_type: "role_binding",
                aggregate_id: "binding-1",
                payload: {
                    role_binding_id: "binding-1",
                },
                headers: {
                    audit_event_id: "audit-1",
                },
                correlation_id: "binding-1",
                reference_type: "application",
                reference_id: "application-1",
                available_at: "2026-05-28T12:00:30.000Z",
                published_at: null,
                attempt_count: 1,
                last_error: null,
                created_at: "2026-05-28T12:00:00.000Z",
            },
        ],
    });
    const repository = new PostgresOutboxRepository(new RecordingQueryPool(client));
    const result = await repository.claimAvailableEvents({
        now: "2026-05-28T12:00:00.000Z",
        batch_size: 10,
        lease_expires_at: "2026-05-28T12:00:30.000Z",
    });
    assert.deepEqual(result, [
        {
            outbox_event_id: "outbox-1",
            tenant_id: "tenant-1",
            topic: "authorization.control-plane",
            event_type: "role_binding.created",
            aggregate_type: "role_binding",
            aggregate_id: "binding-1",
            payload: {
                role_binding_id: "binding-1",
            },
            headers: {
                audit_event_id: "audit-1",
            },
            correlation_id: "binding-1",
            reference_type: "application",
            reference_id: "application-1",
            available_at: "2026-05-28T12:00:30.000Z",
            published_at: null,
            attempt_count: 1,
            last_error: null,
            created_at: "2026-05-28T12:00:00.000Z",
        },
    ]);
    assert.equal(client.calls.length, 1);
    assert.match(client.calls[0]?.queryText ?? "", /FOR UPDATE SKIP LOCKED/i);
    assert.match(client.calls[0]?.queryText ?? "", /attempt_count = outbox\.attempt_count \+ 1/i);
    assert.deepEqual(client.calls[0]?.values, [
        "2026-05-28T12:00:00.000Z",
        10,
        "2026-05-28T12:00:30.000Z",
    ]);
    assert.equal(client.released, true);
});
test("PostgresOutboxRepository marks an unpublished event as published", async () => {
    const client = new RecordingQueryClient();
    const repository = new PostgresOutboxRepository(new RecordingQueryPool(client));
    await repository.markEventPublished({
        outbox_event_id: "outbox-1",
        published_at: "2026-05-28T12:00:10.000Z",
    });
    assert.equal(client.calls.length, 1);
    assert.match(client.calls[0]?.queryText ?? "", /UPDATE outbox_event/i);
    assert.match(client.calls[0]?.queryText ?? "", /published_at = \$2/i);
    assert.match(client.calls[0]?.queryText ?? "", /last_error = NULL/i);
    assert.deepEqual(client.calls[0]?.values, ["outbox-1", "2026-05-28T12:00:10.000Z"]);
    assert.equal(client.released, true);
});
test("PostgresOutboxRepository reschedules an unpublished event after a handler failure", async () => {
    const client = new RecordingQueryClient();
    const repository = new PostgresOutboxRepository(new RecordingQueryPool(client));
    await repository.rescheduleEvent({
        outbox_event_id: "outbox-1",
        available_at: "2026-05-28T12:01:00.000Z",
        last_error: "handler failed",
    });
    assert.equal(client.calls.length, 1);
    assert.match(client.calls[0]?.queryText ?? "", /UPDATE outbox_event/i);
    assert.match(client.calls[0]?.queryText ?? "", /available_at = \$2/i);
    assert.match(client.calls[0]?.queryText ?? "", /last_error = \$3/i);
    assert.deepEqual(client.calls[0]?.values, [
        "outbox-1",
        "2026-05-28T12:01:00.000Z",
        "handler failed",
    ]);
    assert.equal(client.released, true);
});
test("PostgresOutboxRepository rejects malformed JSON payloads from storage", async () => {
    const client = new RecordingQueryClient({
        1: [
            {
                outbox_event_id: "outbox-1",
                tenant_id: "tenant-1",
                topic: "authorization.control-plane",
                event_type: "role_binding.created",
                aggregate_type: "role_binding",
                aggregate_id: "binding-1",
                payload: "invalid",
                headers: {},
                correlation_id: null,
                reference_type: null,
                reference_id: null,
                available_at: "2026-05-28T12:00:30.000Z",
                published_at: null,
                attempt_count: 1,
                last_error: null,
                created_at: "2026-05-28T12:00:00.000Z",
            },
        ],
    });
    const repository = new PostgresOutboxRepository(new RecordingQueryPool(client));
    await assert.rejects(repository.claimAvailableEvents({
        now: "2026-05-28T12:00:00.000Z",
        batch_size: 1,
        lease_expires_at: "2026-05-28T12:00:30.000Z",
    }), /Outbox payload must be a JSON object\./);
    assert.equal(client.released, true);
});
