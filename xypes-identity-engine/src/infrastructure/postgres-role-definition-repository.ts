import { CreateRoleDefinitionError, UpdateRoleDefinitionStatusError } from "../domain/role-definition-errors.js";
import type {
  CreateRoleDefinitionPersistenceInput,
  ListRoleDefinitionsRepositoryInput,
  RoleDefinitionRepository,
  UpdateRoleDefinitionStatusPersistenceInput,
} from "../domain/role-definition-types.js";

interface QueryResult<Row extends { [key: string]: unknown }> {
  rows: Row[];
}

interface QueryResultRow {
  [key: string]: unknown;
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

interface RoleDefinitionRow extends QueryResultRow {
  role_definition_id: string;
  tenant_id: string;
  application_id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "deprecated" | "retired";
  approval_required: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

const ROLE_DEFINITION_NAME_CONSTRAINT = "role_definition_tenant_id_application_id_name_key";
const ROLE_DEFINITION_APPLICATION_CONSTRAINT = "role_definition_tenant_id_application_id_fkey";

const isPostgresError = (error: unknown): error is PostgresError => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "code" in error || "constraint" in error;
};

const mapRoleDefinitionRow = (row: RoleDefinitionRow) => ({
  role_definition_id: row.role_definition_id,
  tenant_id: row.tenant_id,
  application_id: row.application_id,
  name: row.name,
  description: row.description,
  status: row.status,
  approval_required: row.approval_required,
  created_at: row.created_at,
  updated_at: row.updated_at,
  created_by: row.created_by,
  updated_by: row.updated_by,
});

export class PostgresRoleDefinitionRepository implements RoleDefinitionRepository {
  constructor(private readonly databasePool: TransactionPool) {}

  async listRoleDefinitions(input: ListRoleDefinitionsRepositoryInput) {
    const client = await this.databasePool.connect();

    try {
      const values: unknown[] = [input.tenant_id];
      const clauses = ["tenant_id = $1"];

      if (input.application_id !== undefined) {
        values.push(input.application_id);
        clauses.push(`application_id = $${values.length}`);
      }

      if (input.role_definition_ids !== undefined && input.role_definition_ids.length > 0) {
        values.push(input.role_definition_ids);
        clauses.push(`role_definition_id = ANY($${values.length}::text[])`);
      }

      if (input.statuses !== undefined && input.statuses.length > 0) {
        values.push(input.statuses);
        clauses.push(`status = ANY($${values.length}::text[])`);
      }

      if (input.approval_required !== undefined) {
        values.push(input.approval_required);
        clauses.push(`approval_required = $${values.length}`);
      }

      values.push(input.limit ?? 100);

      const result = await client.query<RoleDefinitionRow>(
        `SELECT
           role_definition_id,
           tenant_id,
           application_id,
           name,
           description,
           status,
           approval_required,
           created_at,
           updated_at,
           created_by,
           updated_by
         FROM role_definition
         WHERE ${clauses.join(" AND ")}
         ORDER BY created_at DESC, role_definition_id ASC
         LIMIT $${values.length}`,
        values,
      );

      return result.rows.map(mapRoleDefinitionRow);
    } finally {
      client.release();
    }
  }

  async createRoleDefinition(input: CreateRoleDefinitionPersistenceInput): Promise<void> {
    const client = await this.databasePool.connect();

    try {
      await client.query("BEGIN", []);
      await client.query(
        `INSERT INTO role_definition (
           role_definition_id,
           tenant_id,
           application_id,
           name,
           description,
           status,
           approval_required,
           created_at,
           updated_at,
           created_by,
           updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          input.role_definition.role_definition_id,
          input.role_definition.tenant_id,
          input.role_definition.application_id,
          input.role_definition.name,
          input.role_definition.description,
          input.role_definition.status,
          input.role_definition.approval_required,
          input.role_definition.created_at,
          input.role_definition.updated_at,
          input.role_definition.created_by,
          input.role_definition.updated_by,
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
          input.role_definition.tenant_id,
          "role_definition.created",
          "role_definition",
          input.role_definition.role_definition_id,
          input.actor_principal_id,
          input.actor_subject,
          input.reason,
          null,
          JSON.stringify(input.role_definition),
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
          input.role_definition.tenant_id,
          "authorization.control-plane",
          "role_definition.created",
          "role_definition",
          input.role_definition.role_definition_id,
          JSON.stringify({
            role_definition: input.role_definition,
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
        if (error.code === "23505" && error.constraint === ROLE_DEFINITION_NAME_CONSTRAINT) {
          throw new CreateRoleDefinitionError(
            "ROLE_DEFINITION_DUPLICATE_NAME",
            "A role definition with this name already exists for the application.",
            409,
          );
        }

        if (error.code === "23503" && error.constraint === ROLE_DEFINITION_APPLICATION_CONSTRAINT) {
          throw new CreateRoleDefinitionError(
            "ROLE_DEFINITION_APPLICATION_NOT_FOUND",
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

  async updateRoleDefinitionStatus(input: UpdateRoleDefinitionStatusPersistenceInput) {
    const client = await this.databasePool.connect();

    try {
      await client.query("BEGIN", []);

      const existingResult = await client.query<RoleDefinitionRow>(
        `SELECT
           role_definition_id,
           tenant_id,
           application_id,
           name,
           description,
           status,
           approval_required,
           created_at,
           updated_at,
           created_by,
           updated_by
         FROM role_definition
         WHERE tenant_id = $1
           AND role_definition_id = $2
         FOR UPDATE`,
        [input.tenant_id, input.role_definition_id],
      );

      const existingRow = existingResult.rows[0];

      if (existingRow === undefined) {
        throw new UpdateRoleDefinitionStatusError(
          "ROLE_DEFINITION_NOT_FOUND",
          "The role definition does not exist for the supplied tenant.",
          404,
        );
      }

      const beforeState = mapRoleDefinitionRow(existingRow);
      const afterState = {
        ...beforeState,
        status: input.status,
        updated_at: input.occurred_at,
        updated_by: input.actor_subject,
      };

      await client.query(
        `UPDATE role_definition
         SET status = $1,
             updated_at = $2,
             updated_by = $3
         WHERE tenant_id = $4
           AND role_definition_id = $5`,
        [
          afterState.status,
          afterState.updated_at,
          afterState.updated_by,
          afterState.tenant_id,
          afterState.role_definition_id,
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
          afterState.tenant_id,
          "role_definition.status_updated",
          "role_definition",
          afterState.role_definition_id,
          input.actor_principal_id,
          input.actor_subject,
          input.reason,
          JSON.stringify(beforeState),
          JSON.stringify(afterState),
          input.correlation_id,
          "application",
          afterState.application_id,
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
          afterState.tenant_id,
          "authorization.control-plane",
          "role_definition.status_updated",
          "role_definition",
          afterState.role_definition_id,
          JSON.stringify({
            before: beforeState,
            after: afterState,
            audit_event_id: input.audit_event_id,
            occurred_at: input.occurred_at,
          }),
          JSON.stringify({
            audit_event_id: input.audit_event_id,
          }),
          input.correlation_id,
          "application",
          afterState.application_id,
          input.occurred_at,
          input.occurred_at,
        ],
      );
      await client.query("COMMIT", []);

      return afterState;
    } catch (error) {
      await client.query("ROLLBACK", []);

      if (error instanceof UpdateRoleDefinitionStatusError) {
        throw error;
      }

      throw error;
    } finally {
      client.release();
    }
  }
}