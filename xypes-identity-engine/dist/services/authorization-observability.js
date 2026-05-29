const noopSpan = {
    setAttribute: () => { },
    recordException: () => { },
};
export const noOpAuthorizationTelemetry = {
    runInSpan: async (_spanName, _attributes, callback) => callback(noopSpan),
};
const pruneSpanAttributes = (attributes) => {
    const entries = Object.entries(attributes)
        .filter((entry) => entry[1] !== undefined && entry[1] !== null);
    return Object.fromEntries(entries);
};
export const withAuthorizationSpan = async (telemetry, spanName, attributes, callback) => {
    const resolvedTelemetry = telemetry ?? noOpAuthorizationTelemetry;
    return resolvedTelemetry.runInSpan(spanName, pruneSpanAttributes(attributes), callback);
};
export const buildAuthorizationDecisionLogBindings = (operation, input, decision) => ({
    event_name: "authorization.decision",
    operation,
    tenant_id: input.tenant_id,
    principal_id: input.principal_id,
    application_id: input.application_id,
    action: input.action,
    resource_type: input.resource_type,
    resource_id: input.resource_id,
    decision_id: decision.decision_id,
    outcome: decision.outcome,
    reason_code: decision.reason_code,
    matched_bindings_count: decision.matched_bindings.length,
    deny_policy_id: decision.deny_source?.deny_policy_id ?? null,
});
export const recordAuthorizationDecisionLog = (logger, bindings) => {
    logger?.info(bindings, "Authorization decision resolved.");
};
