import { CreateGroupError } from "../domain/group-errors.js";
const assertValidScope = (input) => {
    const hasApplicationId = input.scope_application_id !== null;
    const hasResourceType = input.scope_resource_type !== null;
    const hasResourceId = input.scope_resource_id !== null;
    switch (input.scope_type) {
        case "platform":
        case "tenant":
            if (hasApplicationId || hasResourceType || hasResourceId) {
                throw new CreateGroupError("GROUP_SCOPE_INVALID", "Platform and tenant groups cannot include application or resource scope fields.", 400);
            }
            return;
        case "application":
            if (!hasApplicationId || hasResourceType || hasResourceId) {
                throw new CreateGroupError("GROUP_SCOPE_INVALID", "Application groups require scope_application_id and cannot include resource scope fields.", 400);
            }
            return;
        case "resource":
            if (!hasApplicationId || !hasResourceType || !hasResourceId) {
                throw new CreateGroupError("GROUP_SCOPE_INVALID", "Resource groups require scope_application_id, scope_resource_type, and scope_resource_id.", 400);
            }
            return;
    }
};
const getReference = (input) => {
    if (input.scope_type === "application" || input.scope_type === "resource") {
        return {
            reference_type: "application",
            reference_id: input.scope_application_id,
        };
    }
    return {
        reference_type: "tenant",
        reference_id: input.tenant_id,
    };
};
export const createGroup = async (input, dependencies) => {
    assertValidScope(input);
    const occurredAt = dependencies.clock.now().toISOString();
    const groupId = dependencies.idGenerator.nextId();
    const auditEventId = dependencies.idGenerator.nextId();
    const outboxEventId = dependencies.idGenerator.nextId();
    const group = {
        group_id: groupId,
        tenant_id: input.tenant_id,
        scope_application_id: input.scope_application_id,
        name: input.name,
        description: input.description,
        group_type: input.group_type,
        owner_principal_id: input.owner_principal_id,
        scope_type: input.scope_type,
        scope_resource_type: input.scope_resource_type,
        scope_resource_id: input.scope_resource_id,
        created_at: occurredAt,
        updated_at: occurredAt,
        created_by: input.actor_subject,
        updated_by: input.actor_subject,
    };
    const reference = getReference(input);
    await dependencies.groupRepository.createGroup({
        group,
        audit_event_id: auditEventId,
        outbox_event_id: outboxEventId,
        actor_principal_id: input.actor_principal_id,
        actor_subject: input.actor_subject,
        reason: input.reason,
        correlation_id: groupId,
        reference_type: reference.reference_type,
        reference_id: reference.reference_id,
        occurred_at: occurredAt,
    });
    return {
        group,
        audit: {
            audit_event_id: auditEventId,
        },
    };
};
