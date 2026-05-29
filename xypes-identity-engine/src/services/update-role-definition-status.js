export const updateRoleDefinitionStatus = async (input, dependencies) => {
    const occurredAt = dependencies.clock.now().toISOString();
    const auditEventId = dependencies.idGenerator.nextId();
    const outboxEventId = dependencies.idGenerator.nextId();
    const roleDefinition = await dependencies.roleDefinitionRepository.updateRoleDefinitionStatus({
        tenant_id: input.tenant_id,
        role_definition_id: input.role_definition_id,
        status: input.status,
        audit_event_id: auditEventId,
        outbox_event_id: outboxEventId,
        actor_principal_id: input.actor_principal_id,
        actor_subject: input.actor_subject,
        reason: input.reason,
        correlation_id: input.role_definition_id,
        occurred_at: occurredAt,
    });
    return {
        role_definition: roleDefinition,
        audit: {
            audit_event_id: auditEventId,
        },
    };
};
