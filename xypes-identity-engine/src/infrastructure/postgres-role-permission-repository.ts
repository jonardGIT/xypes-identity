import { AttachRolePermissionError } from "../domain/role-permission-errors.js";
import type {
  AttachRolePermissionPersistenceInput,
  RolePermissionRepository,
} from "../domain/role-permission-types.js";

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

interface QueryResultRow {
  [key: string]: unknown;
}

interface RoleDefinitionLookupRow extends QueryResultRow {
  role_definition_id: string;
}

interface PermissionLookupRow extends QueryResultRow {
  permission_id: string;
}

interface PostgresError {
  code?: string;
  constraint?: string;
}

const ROLE_PERMISSION_UNIQUE_CONSTRAINT = "role_permission_tenant_id_role_definition_id_permission_id_key";

const isPostgresError = (error: unknown): error is PostgresError => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "code" in error || "constraint" in error;
};

export class PostgresRolePermissionRepository implements RolePermissionRepository {
  constructor(private readonly databasePool: TransactionPool) {}

  async attachRolePermission(input: AttachRolePermissionPersistenceInput): Promise<void> {
    const client = await this.databasePool.connect();

    try {
      await client.query("BEGIN", []);

      const roleDefinitionResult = await client.query<RoleDefinitionLookupRow>(
        `SELECT role_definition_id
         FROM role_definition
         WHERE tenant_id = $1
           AND role_definition_id = $2
         FOR SHARE`,
        [input.role_permission.tenant_id, input.role_permission.role_definition_id],
      );

      if (roleDefinitionResult.rows[0] === undefined) {
        throw new AttachRolePermissionError(
          "ROLE_PERMISSION_ROLE_DEFINITION_NOT_FOUND",
          "The role definition does not exist for the supplied tenant.",
          404,
        );
      }

      const permissionResult = await client.query<PermissionLookupRow>(
        `SELECT permission_id
         FROM permission
         WHERE tenant_id = $1
           AND permission_id = $2
         FOR SHARE`,
        [input.role_permission.tenant_id, input.role_permission.permission_id],
      );

      if (permissionResult.rows[0] === undefined) {
        throw new AttachRolePermissionError(
          "ROLE_PERMISSION_PERMISSION_NOT_FOUND",
          "The permission does not exist for the supplied tenant.",
          404,
        );
      }

      await client.query(
        `INSERT INTO role_permission (
           role_permission_id,
           tenant_id,
           role_definition_id,
           permission_id,
           created_at,
           updated_at,
           created_by,
           updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          input.role_permission.role_permission_id,
          input.role_permission.tenant_id,
          input.role_permission.role_definition_id,
          input.role_permission.permission_id,
          input.role_permission.created_at,
          input.role_permission.updated_at,
          input.role_permission.created_by,
          input.role_permission.updated_by,
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
          input.role_permission.tenant_id,
          "role_permission.attached",
          "role_permission",
          input.role_permission.role_permission_id,
          input.actor_principal_id,
          input.actor_subject,
          input.reason,
          null,
          JSON.stringify(input.role_permission),
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
          input.role_permission.tenant_id,
          "authorization.control-plane",
          "role_permission.attached",
          "role_permission",
          input.role_permission.role_permission_id,
          JSON.stringify({
            role_permission: input.role_permission,
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

      if (error instanceof AttachRolePermissionError) {
        throw error;
      }

      if (isPostgresError(error)) {
        if (error.code === "23505" && error.constraint === ROLE_PERMISSION_UNIQUE_CONSTRAINT) {
          throw new AttachRolePermissionError(
            "ROLE_PERMISSION_DUPLICATE",
            "The permission is already attached to the role definition.",
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