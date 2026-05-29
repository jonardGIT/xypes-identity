import { CreateGroupError } from "../domain/group-errors.js";
export class PostgresGroupRepository {
    databasePool;
    constructor(databasePool) {
        this.databasePool = databasePool;
    }
    async createGroup(input) {
        const client = await this.databasePool.connect();
        try {
            await client.query("BEGIN", []);
            const existingGroupResult = await client.query(`SELECT group_id
         FROM "group"
         WHERE tenant_id = $1
           AND name = $2
         FOR SHARE`, [input.group.tenant_id, input.group.name]);
            if (existingGroupResult.rows[0] !== undefined) {
                throw new CreateGroupError("GROUP_DUPLICATE_NAME", "A group with this name already exists for the tenant.", 409);
            }
            const principalResult = await client.query(`SELECT principal_id
         FROM principal
         WHERE principal_id = $1`, [input.group.owner_principal_id]);
            if (principalResult.rows[0] === undefined) {
                throw new CreateGroupError("GROUP_OWNER_PRINCIPAL_NOT_FOUND", "The owner principal does not exist.", 404);
            }
            if (input.group.scope_application_id !== null) {
                const applicationResult = await client.query(`SELECT application_id
           FROM application
           WHERE tenant_id = $1
             AND application_id = $2`, [input.group.tenant_id, input.group.scope_application_id]);
                if (applicationResult.rows[0] === undefined) {
                    throw new CreateGroupError("GROUP_SCOPE_APPLICATION_NOT_FOUND", "The scope application does not exist for the supplied tenant.", 404);
                }
            }
            await client.query(`INSERT INTO "group" (
           group_id,
           tenant_id,
           scope_application_id,
           name,
           description,
           group_type,
           owner_principal_id,
           scope_type,
           scope_resource_type,
           scope_resource_id,
           created_at,
           updated_at,
           created_by,
           updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [
                input.group.group_id,
                input.group.tenant_id,
                input.group.scope_application_id,
                input.group.name,
                input.group.description,
                input.group.group_type,
                input.group.owner_principal_id,
                input.group.scope_type,
                input.group.scope_resource_type,
                input.group.scope_resource_id,
                input.group.created_at,
                input.group.updated_at,
                input.group.created_by,
                input.group.updated_by,
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
                input.group.tenant_id,
                "group.created",
                "group",
                input.group.group_id,
                input.actor_principal_id,
                input.actor_subject,
                input.reason,
                null,
                JSON.stringify(input.group),
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
                input.group.tenant_id,
                "authorization.control-plane",
                "group.created",
                "group",
                input.group.group_id,
                JSON.stringify({
                    group: input.group,
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
            if (error instanceof CreateGroupError) {
                throw error;
            }
            if (error.code === "23505"
                && error.constraint === "group_tenant_id_name_key") {
                throw new CreateGroupError("GROUP_DUPLICATE_NAME", "A group with this name already exists for the tenant.", 409);
            }
            throw error;
        }
        finally {
            client.release();
        }
    }
}
