import type { ListAuditEventsResponse } from "@xypes-identity/sdk";

type AuditEvent = ListAuditEventsResponse["events"][number];

export interface AdminAuditWorkbenchCount {
  event_type: string;
  total: number;
}

export interface AdminAuditWorkbenchSection {
  entity_type: string;
  total_events: number;
  last_occurred_at: string | null;
  events: AuditEvent[];
}

export interface AdminAuditWorkbenchResponse {
  generated_at: string;
  summary: {
    total_events: number;
    distinct_actor_subjects: number;
    distinct_entity_types: number;
    status_update_events: number;
    counts_by_event_type: AdminAuditWorkbenchCount[];
  };
  sections: AdminAuditWorkbenchSection[];
}

const compareNewestFirst = (left: AuditEvent, right: AuditEvent): number => (
  right.occurred_at.localeCompare(left.occurred_at)
);

export const buildAuditWorkbench = (
  response: ListAuditEventsResponse,
): AdminAuditWorkbenchResponse => {
  const eventsByEntityType = new Map<string, AuditEvent[]>();
  const countsByEventType = new Map<string, number>();

  for (const event of response.events) {
    countsByEventType.set(event.event_type, (countsByEventType.get(event.event_type) ?? 0) + 1);

    const entityEvents = eventsByEntityType.get(event.entity_type) ?? [];
    entityEvents.push(event);
    eventsByEntityType.set(event.entity_type, entityEvents);
  }

  return {
    generated_at: response.generated_at,
    summary: {
      total_events: response.events.length,
      distinct_actor_subjects: new Set(response.events.map((event) => event.actor_subject)).size,
      distinct_entity_types: eventsByEntityType.size,
      status_update_events: response.events.filter((event) => event.event_type.endsWith(".status_updated")).length,
      counts_by_event_type: Array.from(countsByEventType.entries())
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .map(([eventType, total]) => ({
          event_type: eventType,
          total,
        })),
    },
    sections: Array.from(eventsByEntityType.entries())
      .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))
      .map(([entityType, events]) => {
        const orderedEvents = [...events].sort(compareNewestFirst);

        return {
          entity_type: entityType,
          total_events: orderedEvents.length,
          last_occurred_at: orderedEvents[0]?.occurred_at ?? null,
          events: orderedEvents,
        };
      }),
  };
};