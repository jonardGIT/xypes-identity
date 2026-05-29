const EXPANSION_AFFECTING_AGGREGATES = new Set([
    "group",
    "group_membership",
]);
export const getAuthorizationCacheInvalidation = (event) => {
    if (event.topic !== "authorization.control-plane") {
        return null;
    }
    return {
        tenant_id: event.tenant_id,
        decision_version: true,
        expansion_version: EXPANSION_AFFECTING_AGGREGATES.has(event.aggregate_type),
    };
};
