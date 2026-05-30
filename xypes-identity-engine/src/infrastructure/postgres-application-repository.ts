import { CreateApplicationError } from "../domain/application-errors.js";
import type {
  ApplicationRepository,
  CreateApplicationPersistenceInput,
  ListApplicationsRepositoryInput,
} from "../domain/application-types.js";

interface ApplicationRow extends Record<string, unknown> {
  application_id: string;
  tenant_id: string;
  slug: string;
  display_name: string;
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

interface QueryResult<Row extends { [key: string]: unknown }> {
  rows: Row[];
}

interface TransactionClient {
  query<Row extends { [key: string]: unknown }>(
    queryText: string,
    values: readonly unknown[],
  ): Promise<QueryResult<Row>>;
  release(): void;
}

interface TransactionPool {
  connect(): Promise<TransactionClient>;
}

interface PostgresError {
  code?: string;
  constraint?: string;
}

const APPLICATION_TENANT_SLUG_CONSTRAINT = "application_tenant_id_slug_key";

const mapApplicationRow = (row: ApplicationRow) => ({
  application_id: row.application_id,
  tenant_id: row.tenant_id,
  slug: row.slug,
  display_name: row.display_name,
  status: row.status,
  created_at: row.created_at,
  updated_at: row.updated_at,
  created_by: row.created_by,
  updated_by: row.updated_by,
});

const isPostgresError = (error: unknown): error is PostgresError => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "code" in error || "constraint" in error;
};

export class PostgresApplicationRepository implements ApplicationRepository {
  constructor(private readonly databasePool: TransactionPool) {}

  async listApplications(input: ListApplicationsRepositoryInput) {
    const client = await this.databasePool.connect();

    try {
      const values: unknown[] = [input.tenant_id];
      const clauses = ["tenant_id = $1"];

      if (input.application_ids !== undefined && input.application_ids.length > 0) {
        values.push(input.application_ids);
        clauses.push(`application_id = ANY($${values.length}::text[])`);
      }

      if (input.slug !== undefined) {
        values.push(input.slug);
        clauses.push(`slug = $${values.length}`);
      }

      if (input.statuses !== undefined && input.statuses.length > 0) {
        values.push(input.statuses);
        clauses.push(`status = ANY($${values.length}::text[])`);
      }

      values.push(input.limit ?? 100);

      const result = await client.query<ApplicationRow>(
        `SELECT
           application_id,
           tenant_id,
           slug,
           display_name,
           status,
           created_at,
           updated_at,
           created_by,
           updated_by
         FROM application
         WHERE ${clauses.join(" AND ")}
         ORDER BY created_at DESC, application_id ASC
         LIMIT $${values.length}`,
        values,
      );

      return result.rows.map(mapApplicationRow);
    } finally {
      client.release();
    }
  }

  async createApplication(input: CreateApplicationPersistenceInput): Promise<void> {
    const client = await this.databasePool.connect();

    try {
      await client.query("BEGIN", []);
      await client.query(
        `INSERT INTO application (
           application_id,
           tenant_id,
           slug,
           display_name,
           status,
           created_at,
           updated_at,
           created_by,
           updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          input.application.application_id,
          input.application.tenant_id,
          input.application.slug,
          input.application.display_name,
          input.application.status,
          input.application.created_at,
          input.application.updated_at,
          input.application.created_by,
          input.application.updated_by,
        ],
      );
      await client.query(
        `INSERT INTO audit_event (
           audit_event_id,
           tenant_id,
           event_type,
           entity_type,
           entity_id,
           actor_principal_id,
           actor_subject,
           reason,
           before_payload,
           after_payload,
           correlation_id,
           reference_type,
           reference_id,
           occurred_at,
           created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          input.audit_event_id,
          input.application.tenant_id,
          "application.created",
          "application",
          input.application.application_id,
          input.actor_principal_id,
          input.actor_subject,
          input.reason,
          null,
          JSON.stringify(input.application),
          input.correlation_id,
          input.reference_type,
          input.reference_id,
          input.occurred_at,
          input.occurred_at,
        ],
      );
      await client.query(
        `INSERT INTO outbox_event (
           outbox_event_id,
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
           created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          input.outbox_event_id,
          input.application.tenant_id,
          "authorization.control-plane",
          "application.created",
          "application",
          input.application.application_id,
          JSON.stringify({
            application: input.application,
            audit_event_id: input.audit_event_id,
            occurred_at: input.occurred_at,
          }),
          JSON.stringify({
            audit_event_id: input.audit_event_id,
          }),
          input.correlation_id,
          input.reference_type,
          input.reference_id,
          input.occurred_at,
          input.occurred_at,
        ],
      );
      await client.query("COMMIT", []);
    } catch (error) {
      await client.query("ROLLBACK", []);

      if (isPostgresError(error)) {
        if (error.code === "23505" && error.constraint === APPLICATION_TENANT_SLUG_CONSTRAINT) {
          throw new CreateApplicationError(
            "APPLICATION_DUPLICATE_TENANT_SLUG",
            "An application with this slug already exists for the tenant.",
            409,
          );
        }
      }

      throw error;
    } finally {
      client.release();
    }
  }
}