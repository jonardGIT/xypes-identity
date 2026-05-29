import type {
  BumpTenantAuthorizationCacheVersionsInput,
} from "../domain/authorization-cache-types.js";
import type { OutboxEventRecord } from "../domain/outbox-types.js";

const EXPANSION_AFFECTING_AGGREGATES = new Set([
  "group",
  "group_membership",
]);

export const getAuthorizationCacheInvalidation = (
  event: OutboxEventRecord,
): BumpTenantAuthorizationCacheVersionsInput | null => {
  if (event.topic !== "authorization.control-plane") {
    return null;
  }

  return {
    tenant_id: event.tenant_id,
    decision_version: true,
    expansion_version: EXPANSION_AFFECTING_AGGREGATES.has(event.aggregate_type),
  };
};
