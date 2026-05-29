import type { ListAuditEventsResponse } from "@xypes-identity/shared";
import type { ListAuditEventsDependencies, ListAuditEventsServiceInput } from "../domain/audit-event-types.js";
export declare const listAuditEvents: (input: ListAuditEventsServiceInput, dependencies: ListAuditEventsDependencies) => Promise<ListAuditEventsResponse>;
