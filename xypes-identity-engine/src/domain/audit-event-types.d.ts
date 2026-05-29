import type { AuditEventRecord, ListAuditEventsRequest } from "@xypes-identity/shared";
import type { Clock } from "./session-types.js";
export interface AuditEventRepositoryInput {
    tenant_id: string;
    limit: number;
    event_types?: string[];
    entity_type?: string;
    entity_id?: string;
    actor_subject?: string;
    correlation_id?: string;
    reference_type?: string;
    reference_id?: string;
    occurred_after?: string;
}
export interface AuditEventRepository {
    listEvents(input: AuditEventRepositoryInput): Promise<AuditEventRecord[]>;
}
export interface ListAuditEventsDependencies {
    auditEventRepository: AuditEventRepository;
    clock: Clock;
}
export interface ListAuditEventsServiceInput extends ListAuditEventsRequest {
}
