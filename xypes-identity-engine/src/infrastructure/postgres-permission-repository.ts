import { CreatePermissionError } from "../domain/permission-errors.js";
import type {
  CreatePermissionPersistenceInput,
  ListPermissionsRepositoryInput,
  PermissionRepository,
} from "../domain/permission-types.js";

interface PermissionRow extends Record<string, unknown> {
  permission_id: string;
  tenant_id: string;
  application_id: string;
  action: string;
  resource_type: string;
  description: string | null;
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

const PERMISSION_UNIQUE_CONSTRAINT = "permission_tenant_id_application_id_action_resource_type_key";
const PERMISSION_APPLICATION_CONSTRAINT = "permission_tenant_id_application_id_fkey";

const mapPermissionRow = (row: PermissionRow) => ({
  permission_id: row.permission_id,
  tenant_id: row.tenant_id,
  application_id: row.application_id,
  action: row.action,
  resource_type: row.resource_type,
  description: row.description,
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

export class PostgresPermissionRepository implements PermissionRepository {
  constructor(private readonly databasePool: TransactionPool) {}

  async listPermissions(input: ListPermissionsRepositoryInput) {
    const client = await this.databasePool.connect();

    try {
      const values: unknown[] = [input.tenant_id];
      const clauses = ["tenant_id = $1"];

      if (input.application_id !== undefined) {
        values.push(input.application_id);
        clauses.push(`application_id = $${values.length}`);
      }

      if (input.permission_ids !== undefined && input.permission_ids.length > 0) {
        values.push(input.permission_ids);
        clauses.push(`permission_id = ANY($${values.length}::text[])`);
      }

      if (input.action !== undefined) {
        values.push(input.action);
        clauses.push(`action = $${values.length}`);
      }

      if (input.resource_type !== undefined) {
        values.push(input.resource_type);
        clauses.push(`resource_type = $${values.length}`);
      }

      values.push(input.limit ?? 100);

      const result = await client.query<PermissionRow>(
        `SELECT
           permission_id,
           tenant_id,
           application_id,
           action,
           resource_type,
           description,
           created_at,
           updated_at,
           created_by,
           updated_by
         FROM permission
         WHERE ${clauses.join(" AND ")}
         ORDER BY created_at DESC, permission_id ASC
         LIMIT $${values.length}`,
        values,
      );

      return result.rows.map(mapPermissionRow);
    } finally {
      client.release();
    }
  }

  async createPermission(input: CreatePermissionPersistenceInput): Promise<void> {
    const client = await this.databasePool.connect();

    try {
      await client.query("BEGIN", []);
      await client.query(
        `INSERT INTO permission (
           permission_id,
           tenant_id,
           application_id,
           action,
           resource_type,
           description,
           created_at,
           updated_at,
           created_by,
           updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          input.permission.permission_id,
          input.permission.tenant_id,
          input.permission.application_id,
          input.permission.action,
          input.permission.resource_type,
          input.permission.description,
          input.permission.created_at,
          input.permission.updated_at,
          input.permission.created_by,
          input.permission.updated_by,
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
          input.permission.tenant_id,
          "permission.created",
          "permission",
          input.permission.permission_id,
          input.actor_principal_id,
          input.actor_subject,
          input.reason,
          null,
          JSON.stringify(input.permission),
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
          input.permission.tenant_id,
          "authorization.control-plane",
          "permission.created",
          "permission",
          input.permission.permission_id,
          JSON.stringify({
            permission: input.permission,
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
        if (error.code === "23505" && error.constraint === PERMISSION_UNIQUE_CONSTRAINT) {
          throw new CreatePermissionError(
            "PERMISSION_DUPLICATE",
            "A permission with this action and resource type already exists for the application.",
            409,
          );
        }

        if (error.code === "23503" && error.constraint === PERMISSION_APPLICATION_CONSTRAINT) {
          throw new CreatePermissionError(
            "PERMISSION_APPLICATION_NOT_FOUND",
            "The application does not exist for the supplied tenant.",
            404,
          );
        }
      }

      throw error;
    } finally {
      client.release();
    }
  }
}