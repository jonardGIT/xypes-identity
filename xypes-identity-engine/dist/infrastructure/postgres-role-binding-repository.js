import { CreateRoleBindingError, UpdateRoleBindingStatusError, } from "../domain/role-binding-errors.js";
const mapRoleBindingRow = (row) => ({
    role_binding_id: row.role_binding_id,
    tenant_id: row.tenant_id,
    role_definition_id: row.role_definition_id,
    role_binding_status: row.role_binding_status,
    subject_principal_id: row.subject_principal_id,
    subject_group_id: row.subject_group_id,
    scope_type: row.scope_type,
    scope_application_id: row.scope_application_id,
    scope_resource_type: row.scope_resource_type,
    scope_resource_id: row.scope_resource_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    updated_by: row.updated_by,
});
const getSubjectLockKey = (input) => {
    if (input.role_binding.subject_principal_id !== null) {
        return `principal:${input.role_binding.subject_principal_id}`;
    }
    return `group:${input.role_binding.subject_group_id}`;
};
export class PostgresRoleBindingRepository {
    databasePool;
    constructor(databasePool) {
        this.databasePool = databasePool;
    }
    async createRoleBinding(input) {
        const client = await this.databasePool.connect();
        try {
            await client.query("BEGIN", []);
            await client.query(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, [input.role_binding.tenant_id, getSubjectLockKey(input)]);
            const roleDefinitionResult = await client.query(`SELECT role_definition_id,
                approval_required
         FROM role_definition
         WHERE tenant_id = $1
           AND role_definition_id = $2
         FOR SHARE`, [input.role_binding.tenant_id, input.role_binding.role_definition_id]);
            if (roleDefinitionResult.rows[0] === undefined) {
                throw new CreateRoleBindingError("ROLE_BINDING_ROLE_DEFINITION_NOT_FOUND", "The role definition does not exist for the supplied tenant.", 404);
            }
            if (input.role_binding.subject_principal_id !== null) {
                const principalResult = await client.query(`SELECT principal_id
           FROM principal
           WHERE principal_id = $1`, [input.role_binding.subject_principal_id]);
                if (principalResult.rows[0] === undefined) {
                    throw new CreateRoleBindingError("ROLE_BINDING_PRINCIPAL_NOT_FOUND", "The principal subject does not exist.", 404);
                }
            }
            if (input.role_binding.subject_group_id !== null) {
                const groupResult = await client.query(`SELECT group_id
           FROM "group"
           WHERE tenant_id = $1
             AND group_id = $2`, [input.role_binding.tenant_id, input.role_binding.subject_group_id]);
                if (groupResult.rows[0] === undefined) {
                    throw new CreateRoleBindingError("ROLE_BINDING_GROUP_NOT_FOUND", "The group subject does not exist for the supplied tenant.", 404);
                }
            }
            if (input.role_binding.scope_application_id !== null) {
                const applicationResult = await client.query(`SELECT application_id
           FROM application
           WHERE tenant_id = $1
             AND application_id = $2`, [input.role_binding.tenant_id, input.role_binding.scope_application_id]);
                if (applicationResult.rows[0] === undefined) {
                    throw new CreateRoleBindingError("ROLE_BINDING_SCOPE_APPLICATION_NOT_FOUND", "The scope application does not exist for the supplied tenant.", 404);
                }
            }
            const toxicCombinationResult = await client.query(`SELECT
           rb.role_binding_id,
           rb.role_definition_id,
           rtc.conflict_reason
         FROM role_toxic_combination AS rtc
         INNER JOIN role_binding AS rb
           ON rb.tenant_id = rtc.tenant_id
          AND rb.role_definition_id = CASE
            WHEN rtc.role_definition_id_left = $2 THEN rtc.role_definition_id_right
            ELSE rtc.role_definition_id_left
          END
         WHERE rtc.tenant_id = $1
           AND ($2 = rtc.role_definition_id_left OR $2 = rtc.role_definition_id_right)
           AND (
             (rb.subject_principal_id = $3 AND $3 IS NOT NULL)
             OR (rb.subject_group_id = $4 AND $4 IS NOT NULL)
           )
           AND (
             $5 IN ('platform', 'tenant')
             OR (
               $5 = 'application'
               AND (
                 rb.scope_type IN ('platform', 'tenant')
                 OR (rb.scope_type = 'application' AND rb.scope_application_id = $6)
                 OR (rb.scope_type = 'resource' AND rb.scope_application_id = $6)
               )
             )
             OR (
               $5 = 'resource'
               AND (
                 rb.scope_type IN ('platform', 'tenant')
                 OR (rb.scope_type = 'application' AND rb.scope_application_id = $6)
                 OR (
                   rb.scope_type = 'resource'
                   AND rb.scope_application_id = $6
                   AND rb.scope_resource_type = $7
                   AND rb.scope_resource_id = $8
                 )
               )
             )
           )
         ORDER BY rb.role_binding_id ASC
         LIMIT 1
         FOR SHARE`, [
                input.role_binding.tenant_id,
                input.role_binding.role_definition_id,
                input.role_binding.subject_principal_id,
                input.role_binding.subject_group_id,
                input.role_binding.scope_type,
                input.role_binding.scope_application_id,
                input.role_binding.scope_resource_type,
                input.role_binding.scope_resource_id,
            ]);
            const toxicConflict = toxicCombinationResult.rows[0];
            if (toxicConflict !== undefined) {
                throw new CreateRoleBindingError("ROLE_BINDING_SOD_CONFLICT", `The requested role binding is blocked by a toxic role combination with existing role binding ${toxicConflict.role_binding_id}. ${toxicConflict.conflict_reason}`, 409);
            }
            const roleBindingStatus = roleDefinitionResult.rows[0].approval_required
                ? "eligible"
                : "active";
            const persistedRoleBinding = {
                ...input.role_binding,
                role_binding_status: roleBindingStatus,
            };
            await client.query(`INSERT INTO role_binding (
           role_binding_id,
           tenant_id,
           role_definition_id,
           role_binding_status,
           subject_principal_id,
           subject_group_id,
           scope_type,
           scope_application_id,
           scope_resource_type,
           scope_resource_id,
           created_at,
           updated_at,
           created_by,
           updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [
                persistedRoleBinding.role_binding_id,
                persistedRoleBinding.tenant_id,
                persistedRoleBinding.role_definition_id,
                persistedRoleBinding.role_binding_status,
                persistedRoleBinding.subject_principal_id,
                persistedRoleBinding.subject_group_id,
                persistedRoleBinding.scope_type,
                persistedRoleBinding.scope_application_id,
                persistedRoleBinding.scope_resource_type,
                persistedRoleBinding.scope_resource_id,
                persistedRoleBinding.created_at,
                persistedRoleBinding.updated_at,
                persistedRoleBinding.created_by,
                persistedRoleBinding.updated_by,
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
                input.role_binding.tenant_id,
                "role_binding.created",
                "role_binding",
                input.role_binding.role_binding_id,
                input.actor_principal_id,
                input.actor_subject,
                input.reason,
                null,
                JSON.stringify(persistedRoleBinding),
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
                input.role_binding.tenant_id,
                "authorization.control-plane",
                "role_binding.created",
                "role_binding",
                persistedRoleBinding.role_binding_id,
                JSON.stringify({
                    role_binding: persistedRoleBinding,
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
            return persistedRoleBinding;
        }
        catch (error) {
            await client.query("ROLLBACK", []);
            if (error instanceof CreateRoleBindingError) {
                throw error;
            }
            throw error;
        }
        finally {
            client.release();
        }
    }
    async updateRoleBindingStatus(input) {
        const client = await this.databasePool.connect();
        try {
            await client.query("BEGIN", []);
            const existingRoleBindingResult = await client.query(`SELECT
           role_binding_id,
           tenant_id,
           role_definition_id,
           role_binding_status,
           subject_principal_id,
           subject_group_id,
           scope_type,
           scope_application_id,
           scope_resource_type,
           scope_resource_id,
           created_at,
           updated_at,
           created_by,
           updated_by
         FROM role_binding
         WHERE tenant_id = $1
           AND role_binding_id = $2
         FOR UPDATE`, [input.tenant_id, input.role_binding_id]);
            const existingRoleBinding = existingRoleBindingResult.rows[0];
            if (existingRoleBinding === undefined) {
                throw new UpdateRoleBindingStatusError("ROLE_BINDING_NOT_FOUND", "The role binding does not exist for the supplied tenant.", 404);
            }
            const updatedRoleBinding = {
                ...mapRoleBindingRow(existingRoleBinding),
                role_binding_status: input.role_binding_status,
                updated_at: input.occurred_at,
                updated_by: input.actor_subject,
            };
            await client.query(`UPDATE role_binding
         SET role_binding_status = $3,
             updated_at = $4,
             updated_by = $5
         WHERE tenant_id = $1
           AND role_binding_id = $2`, [
                input.tenant_id,
                input.role_binding_id,
                updatedRoleBinding.role_binding_status,
                updatedRoleBinding.updated_at,
                updatedRoleBinding.updated_by,
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
                updatedRoleBinding.tenant_id,
                "role_binding.status_updated",
                "role_binding",
                updatedRoleBinding.role_binding_id,
                input.actor_principal_id,
                input.actor_subject,
                input.reason,
                JSON.stringify(mapRoleBindingRow(existingRoleBinding)),
                JSON.stringify(updatedRoleBinding),
                input.correlation_id,
                updatedRoleBinding.scope_type === "application" || updatedRoleBinding.scope_type === "resource"
                    ? "application"
                    : "tenant",
                updatedRoleBinding.scope_application_id ?? updatedRoleBinding.tenant_id,
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
                updatedRoleBinding.tenant_id,
                "authorization.control-plane",
                "role_binding.status_updated",
                "role_binding",
                updatedRoleBinding.role_binding_id,
                JSON.stringify({
                    before_role_binding: mapRoleBindingRow(existingRoleBinding),
                    role_binding: updatedRoleBinding,
                    audit_event_id: input.audit_event_id,
                    occurred_at: input.occurred_at,
                }),
                JSON.stringify({
                    audit_event_id: input.audit_event_id,
                }),
                input.correlation_id,
                updatedRoleBinding.scope_type === "application" || updatedRoleBinding.scope_type === "resource"
                    ? "application"
                    : "tenant",
                updatedRoleBinding.scope_application_id ?? updatedRoleBinding.tenant_id,
                input.occurred_at,
                input.occurred_at,
            ]);
            await client.query("COMMIT", []);
            return updatedRoleBinding;
        }
        catch (error) {
            await client.query("ROLLBACK", []);
            throw error;
        }
        finally {
            client.release();
        }
    }
}
