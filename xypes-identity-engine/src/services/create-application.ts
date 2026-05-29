import type { ApplicationState, CreateApplicationResponse } from "@xypes-identity/shared";

import type {
  CreateApplicationDependencies,
  CreateApplicationServiceInput,
} from "../domain/application-types.js";

export const createApplication = async (
  input: CreateApplicationServiceInput,
  dependencies: CreateApplicationDependencies,
): Promise<CreateApplicationResponse> => {
  const occurredAt = dependencies.clock.now().toISOString();
  const applicationId = dependencies.idGenerator.nextId();
  const auditEventId = dependencies.idGenerator.nextId();
  const outboxEventId = dependencies.idGenerator.nextId();

  const application: ApplicationState = {
    application_id: applicationId,
    tenant_id: input.tenant_id,
    slug: input.slug,
    display_name: input.display_name,
    status: "active",
    created_at: occurredAt,
    updated_at: occurredAt,
    created_by: input.actor_subject,
    updated_by: input.actor_subject,
  };

  await dependencies.applicationRepository.createApplication({
    application,
    audit_event_id: auditEventId,
    outbox_event_id: outboxEventId,
    actor_principal_id: input.actor_principal_id,
    actor_subject: input.actor_subject,
    reason: input.reason,
    correlation_id: applicationId,
    reference_type: "tenant",
    reference_id: input.tenant_id,
    occurred_at: occurredAt,
  });

  return {
    application,
    audit: {
      audit_event_id: auditEventId,
    },
  };
};