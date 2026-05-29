const compareNewestFirst = (left, right) => (right.occurred_at.localeCompare(left.occurred_at));
export const buildAuditWorkbench = (response) => {
    const eventsByEntityType = new Map();
    const countsByEventType = new Map();
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
