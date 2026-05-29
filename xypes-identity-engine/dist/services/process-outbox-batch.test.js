import assert from "node:assert/strict";
import test from "node:test";
import { processOutboxBatch } from "./process-outbox-batch.js";
class RecordingOutboxRepository {
    claimedEvents;
    claimInput = null;
    publishedInputs = [];
    rescheduledInputs = [];
    constructor(claimedEvents) {
        this.claimedEvents = claimedEvents;
    }
    async claimAvailableEvents(input) {
        this.claimInput = input;
        return this.claimedEvents;
    }
    async markEventPublished(input) {
        this.publishedInputs.push(input);
    }
    async rescheduleEvent(input) {
        this.rescheduledInputs.push(input);
    }
}
class RecordingOutboxEventHandler {
    failureIds;
    handledEventIds = [];
    constructor(failureIds = new Set()) {
        this.failureIds = failureIds;
    }
    async handle(event) {
        this.handledEventIds.push(event.outbox_event_id);
        if (this.failureIds.has(event.outbox_event_id)) {
            throw new Error(`failed to process ${event.outbox_event_id}`);
        }
    }
}
const createEvent = (outboxEventId) => ({
    outbox_event_id: outboxEventId,
    tenant_id: "tenant-1",
    topic: "authorization.control-plane",
    event_type: "role_binding.created",
    aggregate_type: "role_binding",
    aggregate_id: `aggregate-${outboxEventId}`,
    payload: {
        outbox_event_id: outboxEventId,
    },
    headers: {
        audit_event_id: `audit-${outboxEventId}`,
    },
    correlation_id: outboxEventId,
    reference_type: "application",
    reference_id: "application-1",
    available_at: "2026-05-28T12:00:00.000Z",
    published_at: null,
    attempt_count: 0,
    last_error: null,
    created_at: "2026-05-28T11:59:00.000Z",
});
test("processOutboxBatch claims a batch and marks successful events as published", async () => {
    const repository = new RecordingOutboxRepository([createEvent("outbox-1"), createEvent("outbox-2")]);
    const handler = new RecordingOutboxEventHandler();
    const nowValues = [
        new Date("2026-05-28T12:00:00.000Z"),
        new Date("2026-05-28T12:00:01.000Z"),
        new Date("2026-05-28T12:00:02.000Z"),
    ];
    const result = await processOutboxBatch({
        batch_size: 25,
        lease_seconds: 30,
        retry_delay_seconds: 60,
    }, {
        outboxRepository: repository,
        outboxEventHandler: handler,
        clock: {
            now: () => {
                const nextNow = nowValues.shift();
                if (nextNow === undefined) {
                    throw new Error("No more clock values available.");
                }
                return nextNow;
            },
        },
    });
    assert.deepEqual(repository.claimInput, {
        now: "2026-05-28T12:00:00.000Z",
        batch_size: 25,
        lease_expires_at: "2026-05-28T12:00:30.000Z",
    });
    assert.deepEqual(handler.handledEventIds, ["outbox-1", "outbox-2"]);
    assert.deepEqual(repository.publishedInputs, [
        {
            outbox_event_id: "outbox-1",
            published_at: "2026-05-28T12:00:01.000Z",
        },
        {
            outbox_event_id: "outbox-2",
            published_at: "2026-05-28T12:00:02.000Z",
        },
    ]);
    assert.deepEqual(repository.rescheduledInputs, []);
    assert.deepEqual(result, {
        claimed_count: 2,
        published_count: 2,
        failed_count: 0,
    });
});
test("processOutboxBatch reschedules failed events without stopping the batch", async () => {
    const repository = new RecordingOutboxRepository([createEvent("outbox-1"), createEvent("outbox-2")]);
    const handler = new RecordingOutboxEventHandler(new Set(["outbox-2"]));
    const nowValues = [
        new Date("2026-05-28T12:00:00.000Z"),
        new Date("2026-05-28T12:00:01.000Z"),
        new Date("2026-05-28T12:00:02.000Z"),
    ];
    const result = await processOutboxBatch({
        batch_size: 10,
        lease_seconds: 15,
        retry_delay_seconds: 45,
    }, {
        outboxRepository: repository,
        outboxEventHandler: handler,
        clock: {
            now: () => {
                const nextNow = nowValues.shift();
                if (nextNow === undefined) {
                    throw new Error("No more clock values available.");
                }
                return nextNow;
            },
        },
    });
    assert.deepEqual(repository.publishedInputs, [
        {
            outbox_event_id: "outbox-1",
            published_at: "2026-05-28T12:00:01.000Z",
        },
    ]);
    assert.deepEqual(repository.rescheduledInputs, [
        {
            outbox_event_id: "outbox-2",
            available_at: "2026-05-28T12:00:47.000Z",
            last_error: "failed to process outbox-2",
        },
    ]);
    assert.deepEqual(result, {
        claimed_count: 2,
        published_count: 1,
        failed_count: 1,
    });
});
test("processOutboxBatch returns zero counts when no events are available", async () => {
    const repository = new RecordingOutboxRepository([]);
    const handler = new RecordingOutboxEventHandler();
    const result = await processOutboxBatch({
        batch_size: 5,
        lease_seconds: 10,
        retry_delay_seconds: 20,
    }, {
        outboxRepository: repository,
        outboxEventHandler: handler,
        clock: {
            now: () => new Date("2026-05-28T12:00:00.000Z"),
        },
    });
    assert.deepEqual(result, {
        claimed_count: 0,
        published_count: 0,
        failed_count: 0,
    });
    assert.deepEqual(repository.publishedInputs, []);
    assert.deepEqual(repository.rescheduledInputs, []);
});
