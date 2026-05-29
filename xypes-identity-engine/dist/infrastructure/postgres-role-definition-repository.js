import { CreateRoleDefinitionError, UpdateRoleDefinitionStatusError } from "../domain/role-definition-errors.js";
const ROLE_DEFINITION_NAME_CONSTRAINT = "role_definition_tenant_id_application_id_name_key";
const ROLE_DEFINITION_APPLICATION_CONSTRAINT = "role_definition_tenant_id_application_id_fkey";
const isPostgresError = (error) => {
    if (typeof error !== "object" || error === null) {
        return false;
    }
    return "code" in error || "constraint" in error;
};
const mapRoleDefinitionRow = (row) => ({
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
export class PostgresRoleDefinitionRepository {
    databasePool;
    constructor(databasePool) {
        this.databasePool = databasePool;
    }
    async createRoleDefinition(input) {
        const client = await this.databasePool.connect();
        try {
            await client.query("BEGIN", []);
            await client.query(`INSERT INTO role_definition (
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
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
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
            ]);
            await client.query(`INSERT INTO audit_event (
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
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`, [
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
            ]);
            await client.query(`INSERT INTO outbox_event (
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
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
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
            ]);
            await client.query("COMMIT", []);
        }
        catch (error) {
            await client.query("ROLLBACK", []);
            if (isPostgresError(error)) {
                if (error.code === "23505" && error.constraint === ROLE_DEFINITION_NAME_CONSTRAINT) {
                    throw new CreateRoleDefinitionError("ROLE_DEFINITION_DUPLICATE_NAME", "A role definition with this name already exists for the application.", 409);
                }
                if (error.code === "23503" && error.constraint === ROLE_DEFINITION_APPLICATION_CONSTRAINT) {
                    throw new CreateRoleDefinitionError("ROLE_DEFINITION_APPLICATION_NOT_FOUND", "The application does not exist for the supplied tenant.", 404);
                }
            }
            throw error;
        }
        finally {
            client.release();
        }
    }
    async updateRoleDefinitionStatus(input) {
        const client = await this.databasePool.connect();
        try {
            await client.query("BEGIN", []);
            const existingResult = await client.query(`SELECT
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
         FOR UPDATE`, [input.tenant_id, input.role_definition_id]);
            const existingRow = existingResult.rows[0];
            if (existingRow === undefined) {
                throw new UpdateRoleDefinitionStatusError("ROLE_DEFINITION_NOT_FOUND", "The role definition does not exist for the supplied tenant.", 404);
            }
            const beforeState = mapRoleDefinitionRow(existingRow);
            const afterState = {
                ...beforeState,
                status: input.status,
                updated_at: input.occurred_at,
                updated_by: input.actor_subject,
            };
            await client.query(`UPDATE role_definition
         SET status = $1,
             updated_at = $2,
             updated_by = $3
         WHERE tenant_id = $4
           AND role_definition_id = $5`, [
                afterState.status,
                afterState.updated_at,
                afterState.updated_by,
                afterState.tenant_id,
                afterState.role_definition_id,
            ]);
            await client.query(`INSERT INTO audit_event (
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
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`, [
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
            ]);
            await client.query(`INSERT INTO outbox_event (
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
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
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
            ]);
            await client.query("COMMIT", []);
            return afterState;
        }
        catch (error) {
            await client.query("ROLLBACK", []);
            if (error instanceof UpdateRoleDefinitionStatusError) {
                throw error;
            }
            throw error;
        }
        finally {
            client.release();
        }
    }
}
