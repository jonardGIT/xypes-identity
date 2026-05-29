import type { CreatePermissionResponse, PermissionState } from "@xypes-identity/shared";

import type {
  CreatePermissionDependencies,
  CreatePermissionServiceInput,
} from "../domain/permission-types.js";

export const createPermission = async (
  input: CreatePermissionServiceInput,
  dependencies: CreatePermissionDependencies,
): Promise<CreatePermissionResponse> => {
  const occurredAt = dependencies.clock.now().toISOString();
  const permissionId = dependencies.idGenerator.nextId();
  const auditEventId = dependencies.idGenerator.nextId();
  const outboxEventId = dependencies.idGenerator.nextId();

  const permission: PermissionState = {
    permission_id: permissionId,
    tenant_id: input.tenant_id,
    application_id: input.application_id,
    action: input.action,
    resource_type: input.resource_type,
    description: input.description,
    created_at: occurredAt,
    updated_at: occurredAt,
    created_by: input.actor_subject,
    updated_by: input.actor_subject,
  };

  await dependencies.permissionRepository.createPermission({
    permission,
    audit_event_id: auditEventId,
    outbox_event_id: outboxEventId,
    actor_principal_id: input.actor_principal_id,
    actor_subject: input.actor_subject,
    reason: input.reason,
    correlation_id: permissionId,
    reference_type: "application",
    reference_id: input.application_id,
    occurred_at: occurredAt,
  });

  return {
    permission,
    audit: {
      audit_event_id: auditEventId,
    },
  };
};