import { CreateDenyPolicyError } from "../domain/deny-policy-errors.js";
export class PostgresDenyPolicyRepository {
    databasePool;
    constructor(databasePool) {
        this.databasePool = databasePool;
    }
    async createDenyPolicy(input) {
        const client = await this.databasePool.connect();
        try {
            await client.query("BEGIN", []);
            const permissionResult = await client.query(`SELECT permission_id
         FROM permission
         WHERE tenant_id = $1
           AND permission_id = $2
         FOR SHARE`, [input.deny_policy.tenant_id, input.deny_policy.permission_id]);
            if (permissionResult.rows[0] === undefined) {
                throw new CreateDenyPolicyError("DENY_POLICY_PERMISSION_NOT_FOUND", "The permission does not exist for the supplied tenant.", 404);
            }
            if (input.deny_policy.subject_principal_id !== null) {
                const principalResult = await client.query(`SELECT principal_id
           FROM principal
           WHERE principal_id = $1`, [input.deny_policy.subject_principal_id]);
                if (principalResult.rows[0] === undefined) {
                    throw new CreateDenyPolicyError("DENY_POLICY_PRINCIPAL_NOT_FOUND", "The principal subject does not exist.", 404);
                }
            }
            if (input.deny_policy.subject_group_id !== null) {
                const groupResult = await client.query(`SELECT group_id
           FROM "group"
           WHERE tenant_id = $1
             AND group_id = $2`, [input.deny_policy.tenant_id, input.deny_policy.subject_group_id]);
                if (groupResult.rows[0] === undefined) {
                    throw new CreateDenyPolicyError("DENY_POLICY_GROUP_NOT_FOUND", "The group subject does not exist for the supplied tenant.", 404);
                }
            }
            if (input.deny_policy.scope_application_id !== null) {
                const applicationResult = await client.query(`SELECT application_id
           FROM application
           WHERE tenant_id = $1
             AND application_id = $2`, [input.deny_policy.tenant_id, input.deny_policy.scope_application_id]);
                if (applicationResult.rows[0] === undefined) {
                    throw new CreateDenyPolicyError("DENY_POLICY_SCOPE_APPLICATION_NOT_FOUND", "The scope application does not exist for the supplied tenant.", 404);
                }
            }
            await client.query(`INSERT INTO deny_policy (
           deny_policy_id,
           tenant_id,
           permission_id,
           subject_principal_id,
           subject_group_id,
           scope_type,
           scope_application_id,
           scope_resource_type,
           scope_resource_id,
           reason,
           created_at,
           updated_at,
           created_by,
           updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [
                input.deny_policy.deny_policy_id,
                input.deny_policy.tenant_id,
                input.deny_policy.permission_id,
                input.deny_policy.subject_principal_id,
                input.deny_policy.subject_group_id,
                input.deny_policy.scope_type,
                input.deny_policy.scope_application_id,
                input.deny_policy.scope_resource_type,
                input.deny_policy.scope_resource_id,
                input.deny_policy.reason,
                input.deny_policy.created_at,
                input.deny_policy.updated_at,
                input.deny_policy.created_by,
                input.deny_policy.updated_by,
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
                input.deny_policy.tenant_id,
                "deny_policy.created",
                "deny_policy",
                input.deny_policy.deny_policy_id,
                input.actor_principal_id,
                input.actor_subject,
                input.audit_reason,
                null,
                JSON.stringify(input.deny_policy),
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
                input.deny_policy.tenant_id,
                "authorization.control-plane",
                "deny_policy.created",
                "deny_policy",
                input.deny_policy.deny_policy_id,
                JSON.stringify({
                    deny_policy: input.deny_policy,
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
            if (error instanceof CreateDenyPolicyError) {
                throw error;
            }
            throw error;
        }
        finally {
            client.release();
        }
    }
}
