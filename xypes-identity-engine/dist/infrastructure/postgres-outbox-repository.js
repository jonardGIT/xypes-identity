const asJsonObject = (value, fieldName) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`Outbox ${fieldName} must be a JSON object.`);
    }
    return value;
};
const mapOutboxEventRow = (row) => ({
    outbox_event_id: row.outbox_event_id,
    tenant_id: row.tenant_id,
    topic: row.topic,
    event_type: row.event_type,
    aggregate_type: row.aggregate_type,
    aggregate_id: row.aggregate_id,
    payload: asJsonObject(row.payload, "payload"),
    headers: asJsonObject(row.headers, "headers"),
    correlation_id: row.correlation_id,
    reference_type: row.reference_type,
    reference_id: row.reference_id,
    available_at: row.available_at,
    published_at: row.published_at,
    attempt_count: row.attempt_count,
    last_error: row.last_error,
    created_at: row.created_at,
});
export class PostgresOutboxRepository {
    databasePool;
    constructor(databasePool) {
        this.databasePool = databasePool;
    }
    async claimAvailableEvents(input) {
        const client = await this.databasePool.connect();
        try {
            const result = await client.query(`WITH candidate AS (
           SELECT outbox_event_id,
                  ROW_NUMBER() OVER (ORDER BY available_at ASC, created_at ASC) AS claim_order
           FROM outbox_event
           WHERE published_at IS NULL
             AND available_at <= $1
           ORDER BY available_at ASC, created_at ASC
           LIMIT $2
           FOR UPDATE SKIP LOCKED
         ),
         claimed AS (
           UPDATE outbox_event AS outbox
           SET attempt_count = outbox.attempt_count + 1,
               available_at = $3
           FROM candidate
           WHERE outbox.outbox_event_id = candidate.outbox_event_id
           RETURNING outbox.outbox_event_id,
                     outbox.tenant_id,
                     outbox.topic,
                     outbox.event_type,
                     outbox.aggregate_type,
                     outbox.aggregate_id,
                     outbox.payload,
                     outbox.headers,
                     outbox.correlation_id,
                     outbox.reference_type,
                     outbox.reference_id,
                     outbox.available_at,
                     outbox.published_at,
                     outbox.attempt_count,
                     outbox.last_error,
                     outbox.created_at,
                     candidate.claim_order
         )
         SELECT outbox_event_id,
                tenant_id,
                topic,
                event_type,
                aggregate_type,
                aggregate_id,
                payload,
                headers,
                correlation_id,
                reference_type,
                reference_id,
                available_at,
                published_at,
                attempt_count,
                last_error,
                created_at
         FROM claimed
         ORDER BY claim_order ASC`, [input.now, input.batch_size, input.lease_expires_at]);
            return result.rows.map(mapOutboxEventRow);
        }
        finally {
            client.release();
        }
    }
    async markEventPublished(input) {
        const client = await this.databasePool.connect();
        try {
            await client.query(`UPDATE outbox_event
         SET published_at = $2,
             last_error = NULL
         WHERE outbox_event_id = $1
           AND published_at IS NULL`, [input.outbox_event_id, input.published_at]);
        }
        finally {
            client.release();
        }
    }
    async rescheduleEvent(input) {
        const client = await this.databasePool.connect();
        try {
            await client.query(`UPDATE outbox_event
         SET available_at = $2,
             last_error = $3
         WHERE outbox_event_id = $1
           AND published_at IS NULL`, [input.outbox_event_id, input.available_at, input.last_error]);
        }
        finally {
            client.release();
        }
    }
}
