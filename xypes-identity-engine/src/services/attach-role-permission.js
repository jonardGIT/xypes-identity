export const attachRolePermission = async (input, dependencies) => {
    const occurredAt = dependencies.clock.now().toISOString();
    const rolePermissionId = dependencies.idGenerator.nextId();
    const auditEventId = dependencies.idGenerator.nextId();
    const outboxEventId = dependencies.idGenerator.nextId();
    const rolePermission = {
        role_permission_id: rolePermissionId,
        tenant_id: input.tenant_id,
        role_definition_id: input.role_definition_id,
        permission_id: input.permission_id,
        created_at: occurredAt,
        updated_at: occurredAt,
        created_by: input.actor_subject,
        updated_by: input.actor_subject,
    };
    await dependencies.rolePermissionRepository.attachRolePermission({
        role_permission: rolePermission,
        audit_event_id: auditEventId,
        outbox_event_id: outboxEventId,
        actor_principal_id: input.actor_principal_id,
        actor_subject: input.actor_subject,
        reason: input.reason,
        correlation_id: rolePermissionId,
        reference_type: "role_definition",
        reference_id: input.role_definition_id,
        occurred_at: occurredAt,
    });
    return {
        role_permission: rolePermission,
        audit: {
            audit_event_id: auditEventId,
        },
    };
};
