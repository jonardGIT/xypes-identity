import type { ListAuditEventsResponse } from "@xypes-identity/shared";

import type {
  ListAuditEventsDependencies,
  ListAuditEventsServiceInput,
} from "../domain/audit-event-types.js";

const DEFAULT_AUDIT_EVENTS_LIMIT = 100;

const normalizeEventTypes = (eventTypes: string[] | undefined): string[] | undefined => {
  if (eventTypes === undefined || eventTypes.length === 0) {
    return undefined;
  }

  return [...new Set(eventTypes)].sort();
};

export const listAuditEvents = async (
  input: ListAuditEventsServiceInput,
  dependencies: ListAuditEventsDependencies,
): Promise<ListAuditEventsResponse> => ({
  generated_at: dependencies.clock.now().toISOString(),
  events: await dependencies.auditEventRepository.listEvents({
    tenant_id: input.tenant_id,
    limit: input.limit ?? DEFAULT_AUDIT_EVENTS_LIMIT,
    event_types: normalizeEventTypes(input.event_types),
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    actor_subject: input.actor_subject,
    correlation_id: input.correlation_id,
    reference_type: input.reference_type,
    reference_id: input.reference_id,
    occurred_after: input.occurred_after,
  }),
});