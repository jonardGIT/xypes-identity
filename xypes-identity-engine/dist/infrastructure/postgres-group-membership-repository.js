import { CreateGroupMembershipError } from "../domain/group-membership-errors.js";
const MAX_GROUP_TRAVERSAL_DEPTH = 16;
export class PostgresGroupMembershipRepository {
    databasePool;
    constructor(databasePool) {
        this.databasePool = databasePool;
    }
    async createGroupMembership(input) {
        const client = await this.databasePool.connect();
        try {
            await client.query("BEGIN", []);
            const targetGroupResult = await client.query(`SELECT group_id
         FROM "group"
         WHERE tenant_id = $1
           AND group_id = $2
         FOR SHARE`, [input.group_membership.tenant_id, input.group_membership.group_id]);
            if (targetGroupResult.rows[0] === undefined) {
                throw new CreateGroupMembershipError("GROUP_MEMBERSHIP_TARGET_GROUP_NOT_FOUND", "The target group does not exist for the supplied tenant.", 404);
            }
            if (input.group_membership.member_principal_id !== null) {
                const principalResult = await client.query(`SELECT principal_id
           FROM principal
           WHERE principal_id = $1`, [input.group_membership.member_principal_id]);
                if (principalResult.rows[0] === undefined) {
                    throw new CreateGroupMembershipError("GROUP_MEMBERSHIP_PRINCIPAL_NOT_FOUND", "The principal subject does not exist.", 404);
                }
            }
            if (input.group_membership.member_group_id !== null) {
                const memberGroupResult = await client.query(`SELECT group_id
           FROM "group"
           WHERE tenant_id = $1
             AND group_id = $2`, [input.group_membership.tenant_id, input.group_membership.member_group_id]);
                if (memberGroupResult.rows[0] === undefined) {
                    throw new CreateGroupMembershipError("GROUP_MEMBERSHIP_MEMBER_GROUP_NOT_FOUND", "The member group does not exist for the supplied tenant.", 404);
                }
                const cycleResult = await client.query(`WITH RECURSIVE containing_groups AS (
             SELECT gm.group_id, 1 AS depth
             FROM group_membership gm
             WHERE gm.tenant_id = $1
               AND gm.member_group_id = $2
             UNION ALL
             SELECT gm.group_id, containing_groups.depth + 1
             FROM group_membership gm
             INNER JOIN containing_groups
               ON gm.member_group_id = containing_groups.group_id
             WHERE gm.tenant_id = $1
               AND containing_groups.depth < $3
           )
           SELECT group_id
           FROM containing_groups
           WHERE group_id = $4
           LIMIT 1`, [
                    input.group_membership.tenant_id,
                    input.group_membership.member_group_id,
                    MAX_GROUP_TRAVERSAL_DEPTH,
                    input.group_membership.group_id,
                ]);
                if (cycleResult.rows[0] !== undefined) {
                    throw new CreateGroupMembershipError("GROUP_MEMBERSHIP_CYCLE_DETECTED", "The nested group membership would introduce a cycle.", 400);
                }
            }
            await client.query(`INSERT INTO group_membership (
           group_membership_id,
           tenant_id,
           group_id,
           member_principal_id,
           member_group_id,
           membership_source,
           created_at,
           updated_at,
           created_by,
           updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                input.group_membership.group_membership_id,
                input.group_membership.tenant_id,
                input.group_membership.group_id,
                input.group_membership.member_principal_id,
                input.group_membership.member_group_id,
                input.group_membership.membership_source,
                input.group_membership.created_at,
                input.group_membership.updated_at,
                input.group_membership.created_by,
                input.group_membership.updated_by,
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
                input.group_membership.tenant_id,
                "group_membership.created",
                "group_membership",
                input.group_membership.group_membership_id,
                input.actor_principal_id,
                input.actor_subject,
                input.reason,
                null,
                JSON.stringify(input.group_membership),
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
                input.group_membership.tenant_id,
                "authorization.control-plane",
                "group_membership.created",
                "group_membership",
                input.group_membership.group_membership_id,
                JSON.stringify({
                    group_membership: input.group_membership,
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
            if (error instanceof CreateGroupMembershipError) {
                throw error;
            }
            throw error;
        }
        finally {
            client.release();
        }
    }
}
