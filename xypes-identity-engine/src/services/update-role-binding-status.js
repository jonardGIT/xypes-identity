export const updateRoleBindingStatus = async (input, dependencies) => {
    const occurredAt = dependencies.clock.now().toISOString();
    const auditEventId = dependencies.idGenerator.nextId();
    const outboxEventId = dependencies.idGenerator.nextId();
    const roleBinding = await dependencies.roleBindingRepository.updateRoleBindingStatus({
        tenant_id: input.tenant_id,
        role_binding_id: input.role_binding_id,
        role_binding_status: input.role_binding_status,
        audit_event_id: auditEventId,
        outbox_event_id: outboxEventId,
        actor_principal_id: input.actor_principal_id,
        actor_subject: input.actor_subject,
        reason: input.reason,
        correlation_id: input.role_binding_id,
        occurred_at: occurredAt,
    });
    return {
        role_binding: roleBinding,
        audit: {
            audit_event_id: auditEventId,
        },
    };
};
