import type { AuditEventRecord } from "@xypes-identity/shared";

import type {
  AuditEventRepository,
  AuditEventRepositoryInput,
} from "../domain/audit-event-types.js";

interface QueryResultRow {
  [key: string]: unknown;
}

interface QueryablePool {
  query<Row extends QueryResultRow>(
    queryText: string,
    values: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
}

interface AuditEventRow extends QueryResultRow {
  audit_event_id: string;
  tenant_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor_principal_id: string | null;
  actor_subject: string;
  reason: string;
  before_payload: unknown | null;
  after_payload: unknown | null;
  correlation_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  occurred_at: string;
}

const mapAuditEventRow = (row: AuditEventRow): AuditEventRecord => ({
  audit_event_id: row.audit_event_id,
  tenant_id: row.tenant_id,
  event_type: row.event_type,
  entity_type: row.entity_type,
  entity_id: row.entity_id,
  actor_principal_id: row.actor_principal_id,
  actor_subject: row.actor_subject,
  reason: row.reason,
  before_payload: row.before_payload,
  after_payload: row.after_payload,
  correlation_id: row.correlation_id,
  reference_type: row.reference_type,
  reference_id: row.reference_id,
  occurred_at: row.occurred_at,
});

const buildListAuditEventsQuery = (input: AuditEventRepositoryInput): {
  queryText: string;
  values: unknown[];
} => {
  const clauses = ["ae.tenant_id = $1"];
  const values: unknown[] = [input.tenant_id];

  if (input.event_types !== undefined) {
    values.push(input.event_types);
    clauses.push(`ae.event_type = ANY($${values.length}::text[])`);
  }

  if (input.entity_type !== undefined) {
    values.push(input.entity_type);
    clauses.push(`ae.entity_type = $${values.length}`);
  }

  if (input.entity_id !== undefined) {
    values.push(input.entity_id);
    clauses.push(`ae.entity_id = $${values.length}`);
  }

  if (input.actor_subject !== undefined) {
    values.push(input.actor_subject);
    clauses.push(`ae.actor_subject = $${values.length}`);
  }

  if (input.correlation_id !== undefined) {
    values.push(input.correlation_id);
    clauses.push(`ae.correlation_id = $${values.length}`);
  }

  if (input.reference_type !== undefined) {
    values.push(input.reference_type);
    clauses.push(`ae.reference_type = $${values.length}`);
  }

  if (input.reference_id !== undefined) {
    values.push(input.reference_id);
    clauses.push(`ae.reference_id = $${values.length}`);
  }

  if (input.occurred_after !== undefined) {
    values.push(input.occurred_after);
    clauses.push(`ae.occurred_at >= $${values.length}::timestamptz`);
  }

  values.push(input.limit);

  return {
    queryText: `SELECT
  ae.audit_event_id::text AS audit_event_id,
  ae.tenant_id::text AS tenant_id,
  ae.event_type,
  ae.entity_type,
  ae.entity_id,
  ae.actor_principal_id::text AS actor_principal_id,
  ae.actor_subject,
  ae.reason,
  ae.before_payload,
  ae.after_payload,
  ae.correlation_id,
  ae.reference_type,
  ae.reference_id,
  ae.occurred_at::text AS occurred_at
FROM audit_event AS ae
WHERE ${clauses.join("\n  AND ")}
ORDER BY ae.occurred_at DESC, ae.audit_event_id DESC
LIMIT $${values.length}`,
    values,
  };
};

export class PostgresAuditEventRepository implements AuditEventRepository {
  constructor(private readonly databasePool: QueryablePool) {}

  async listEvents(input: AuditEventRepositoryInput): Promise<AuditEventRecord[]> {
    const { queryText, values } = buildListAuditEventsQuery(input);
    const result = await this.databasePool.query<AuditEventRow>(queryText, values);

    return result.rows.map(mapAuditEventRow);
  }
}