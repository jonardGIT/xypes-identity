import type { CreateRoleDefinitionResponse, RoleDefinitionState } from "@xypes-identity/shared";

import type {
  CreateRoleDefinitionDependencies,
  CreateRoleDefinitionServiceInput,
} from "../domain/role-definition-types.js";

export const createRoleDefinition = async (
  input: CreateRoleDefinitionServiceInput,
  dependencies: CreateRoleDefinitionDependencies,
): Promise<CreateRoleDefinitionResponse> => {
  const occurredAt = dependencies.clock.now().toISOString();
  const roleDefinitionId = dependencies.idGenerator.nextId();
  const auditEventId = dependencies.idGenerator.nextId();
  const outboxEventId = dependencies.idGenerator.nextId();

  const roleDefinition: RoleDefinitionState = {
    role_definition_id: roleDefinitionId,
    tenant_id: input.tenant_id,
    application_id: input.application_id,
    name: input.name,
    description: input.description,
    status: "draft",
    approval_required: input.approval_required,
    created_at: occurredAt,
    updated_at: occurredAt,
    created_by: input.actor_subject,
    updated_by: input.actor_subject,
  };

  await dependencies.roleDefinitionRepository.createRoleDefinition({
    role_definition: roleDefinition,
    audit_event_id: auditEventId,
    outbox_event_id: outboxEventId,
    actor_principal_id: input.actor_principal_id,
    actor_subject: input.actor_subject,
    reason: input.reason,
    correlation_id: roleDefinitionId,
    reference_type: "application",
    reference_id: input.application_id,
    occurred_at: occurredAt,
  });

  return {
    role_definition: roleDefinition,
    audit: {
      audit_event_id: auditEventId,
    },
  };
};