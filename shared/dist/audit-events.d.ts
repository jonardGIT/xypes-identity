export interface ListAuditEventsRequest {
    tenant_id: string;
    limit?: number;
    event_types?: string[];
    entity_type?: string;
    entity_id?: string;
    actor_subject?: string;
    correlation_id?: string;
    reference_type?: string;
    reference_id?: string;
    occurred_after?: string;
}
export interface AuditEventRecord {
    audit_event_id: string;
    tenant_id: string;
    event_type: string;
    entity_type: string;
    entity_id: string;
    actor_principal_id: string | null;
    actor_subject: string;
    reason: string;
    before_payload: unknown | null;
    after_payload: unknown | null;
    correlation_id: string | null;
    reference_type: string | null;
    reference_id: string | null;
    occurred_at: string;
}
export interface ListAuditEventsResponse {
    generated_at: string;
    events: AuditEventRecord[];
}
