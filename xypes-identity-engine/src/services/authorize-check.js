import { buildAuthorizationDecisionLogBindings, recordAuthorizationDecisionLog, withAuthorizationSpan, } from "./authorization-observability.js";
import { loadAuthorizationEvaluationSnapshot, loadTenantAuthorizationCacheVersions, } from "./authorization-cache.js";
import { resolveAuthorizationDecision, resolveSuspendedAuthorizationDecision, } from "./authorization-decision.js";
const toMatchedBinding = ({ subject: _subject, ...binding }) => binding;
const toDenySource = ({ subject: _subject, ...denySource }) => denySource;
export const authorizeCheck = async (input, dependencies) => {
    return withAuthorizationSpan(dependencies.decisionTelemetry, "authorization.authorize_check", {
        "authorization.operation": "authorize.check",
        "authorization.tenant_id": input.tenant_id,
        "authorization.principal_id": input.principal_id,
        "authorization.application_id": input.application_id,
        "authorization.action": input.action,
        "authorization.resource_type": input.resource_type,
        "authorization.resource_id": input.resource_id,
    }, async (span) => {
        const principalAccessState = await dependencies.authorizationRepository.findPrincipalAccessState?.(input);
        if (principalAccessState?.principal_status === "suspended") {
            const decision = resolveSuspendedAuthorizationDecision("PRINCIPAL_SUSPENDED", dependencies.decisionIdGenerator);
            span.setAttribute("authorization.principal_status", principalAccessState.principal_status);
            span.setAttribute("authorization.decision_id", decision.decision_id);
            span.setAttribute("authorization.outcome", decision.outcome);
            span.setAttribute("authorization.reason_code", decision.reason_code);
            span.setAttribute("authorization.matched_bindings_count", 0);
            recordAuthorizationDecisionLog(dependencies.decisionLogger, buildAuthorizationDecisionLogBindings("authorize.check", input, decision));
            return {
                outcome: decision.outcome,
                decision_id: decision.decision_id,
                reason_code: decision.reason_code,
                matched_bindings: [],
            };
        }
        if (principalAccessState?.tenant_membership_status === "suspended") {
            const decision = resolveSuspendedAuthorizationDecision("TENANT_MEMBERSHIP_SUSPENDED", dependencies.decisionIdGenerator);
            span.setAttribute("authorization.tenant_membership_status", principalAccessState.tenant_membership_status);
            span.setAttribute("authorization.decision_id", decision.decision_id);
            span.setAttribute("authorization.outcome", decision.outcome);
            span.setAttribute("authorization.reason_code", decision.reason_code);
            span.setAttribute("authorization.matched_bindings_count", 0);
            recordAuthorizationDecisionLog(dependencies.decisionLogger, buildAuthorizationDecisionLogBindings("authorize.check", input, decision));
            return {
                outcome: decision.outcome,
                decision_id: decision.decision_id,
                reason_code: decision.reason_code,
                matched_bindings: [],
            };
        }
        const cacheVersions = await loadTenantAuthorizationCacheVersions(input.tenant_id, dependencies.authorizationCache);
        const snapshot = await loadAuthorizationEvaluationSnapshot(input, dependencies, cacheVersions);
        const decision = resolveAuthorizationDecision(snapshot.matched_bindings, snapshot.deny_policies, dependencies.decisionIdGenerator);
        span.setAttribute("authorization.decision_id", decision.decision_id);
        span.setAttribute("authorization.outcome", decision.outcome);
        span.setAttribute("authorization.reason_code", decision.reason_code);
        span.setAttribute("authorization.matched_bindings_count", decision.matched_bindings.length);
        if (decision.deny_source !== undefined) {
            span.setAttribute("authorization.deny_policy_id", decision.deny_source.deny_policy_id);
        }
        recordAuthorizationDecisionLog(dependencies.decisionLogger, buildAuthorizationDecisionLogBindings("authorize.check", input, decision));
        return {
            outcome: decision.outcome,
            decision_id: decision.decision_id,
            reason_code: decision.reason_code,
            matched_bindings: decision.matched_bindings.map(toMatchedBinding),
            deny_source: decision.deny_source !== undefined ? toDenySource(decision.deny_source) : undefined,
        };
    });
};
