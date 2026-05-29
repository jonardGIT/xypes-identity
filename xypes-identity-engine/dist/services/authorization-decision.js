const scopeRank = {
    platform: 0,
    tenant: 1,
    application: 2,
    resource: 3,
};
const compareDenySpecificity = (left, right) => {
    const rankDifference = scopeRank[left.scope_type] - scopeRank[right.scope_type];
    if (rankDifference !== 0) {
        return rankDifference;
    }
    return left.deny_policy_id.localeCompare(right.deny_policy_id);
};
export const resolveSuspendedAuthorizationDecision = (reasonCode, decisionIdGenerator) => ({
    outcome: "deny",
    decision_id: decisionIdGenerator.nextId(),
    reason_code: reasonCode,
    matched_bindings: [],
});
export const resolveAuthorizationDecision = (matchedBindings, denyPolicies, decisionIdGenerator) => {
    const denySource = [...denyPolicies].sort(compareDenySpecificity)[0];
    if (denySource !== undefined) {
        return {
            outcome: "deny",
            decision_id: decisionIdGenerator.nextId(),
            reason_code: "DENY_MATCHED_POLICY",
            matched_bindings: matchedBindings,
            deny_source: denySource,
        };
    }
    if (matchedBindings.length > 0) {
        return {
            outcome: "allow",
            decision_id: decisionIdGenerator.nextId(),
            reason_code: "ALLOW_MATCHED_BINDING",
            matched_bindings: matchedBindings,
        };
    }
    return {
        outcome: "deny",
        decision_id: decisionIdGenerator.nextId(),
        reason_code: "NO_MATCHING_BINDING",
        matched_bindings: [],
    };
};
