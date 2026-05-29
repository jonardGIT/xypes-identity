import { buildAuthorizationDecisionLogBindings, recordAuthorizationDecisionLog, withAuthorizationSpan, } from "./authorization-observability.js";
import { loadAuthorizationEvaluationSnapshot, loadAuthorizationTraversalHits, loadTenantAuthorizationCacheVersions, } from "./authorization-cache.js";
import { resolveAuthorizationDecision, resolveSuspendedAuthorizationDecision, } from "./authorization-decision.js";
const toMatchedBinding = ({ subject: _subject, ...binding }) => binding;
const toDenySource = ({ subject: _subject, ...denySource }) => denySource;
const toSubjectMatch = (subject) => ({
    subject_type: subject.subject_type,
    subject_principal_id: subject.subject_principal_id,
    subject_group_id: subject.subject_group_id,
    membership_depth: subject.membership_depth,
});
const toAllowMatch = (binding) => ({
    role_binding_id: binding.role_binding_id,
    subject: toSubjectMatch(binding.subject),
});
const toDenyMatch = (denyPolicy) => ({
    deny_policy_id: denyPolicy.deny_policy_id,
    subject: toSubjectMatch(denyPolicy.subject),
});
export const authorizeExplain = async (input, dependencies) => {
    return withAuthorizationSpan(dependencies.decisionTelemetry, "authorization.authorize_explain", {
        "authorization.operation": "authorize.explain",
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
            span.setAttribute("authorization.traversal_hit_count", 0);
            recordAuthorizationDecisionLog(dependencies.decisionLogger, buildAuthorizationDecisionLogBindings("authorize.explain", input, decision));
            return {
                outcome: decision.outcome,
                decision_id: decision.decision_id,
                reason_code: decision.reason_code,
                matched_bindings: [],
                trace: {
                    allow_matches: [],
                    deny_matches: [],
                    traversal_hits: [],
                },
            };
        }
        if (principalAccessState?.tenant_membership_status === "suspended") {
            const decision = resolveSuspendedAuthorizationDecision("TENANT_MEMBERSHIP_SUSPENDED", dependencies.decisionIdGenerator);
            span.setAttribute("authorization.tenant_membership_status", principalAccessState.tenant_membership_status);
            span.setAttribute("authorization.decision_id", decision.decision_id);
            span.setAttribute("authorization.outcome", decision.outcome);
            span.setAttribute("authorization.reason_code", decision.reason_code);
            span.setAttribute("authorization.matched_bindings_count", 0);
            span.setAttribute("authorization.traversal_hit_count", 0);
            recordAuthorizationDecisionLog(dependencies.decisionLogger, buildAuthorizationDecisionLogBindings("authorize.explain", input, decision));
            return {
                outcome: decision.outcome,
                decision_id: decision.decision_id,
                reason_code: decision.reason_code,
                matched_bindings: [],
                trace: {
                    allow_matches: [],
                    deny_matches: [],
                    traversal_hits: [],
                },
            };
        }
        const cacheVersions = await loadTenantAuthorizationCacheVersions(input.tenant_id, dependencies.authorizationCache);
        const [snapshot, traversalHits] = await Promise.all([
            loadAuthorizationEvaluationSnapshot(input, dependencies, cacheVersions),
            loadAuthorizationTraversalHits(input, dependencies, cacheVersions),
        ]);
        const decision = resolveAuthorizationDecision(snapshot.matched_bindings, snapshot.deny_policies, dependencies.decisionIdGenerator);
        span.setAttribute("authorization.decision_id", decision.decision_id);
        span.setAttribute("authorization.outcome", decision.outcome);
        span.setAttribute("authorization.reason_code", decision.reason_code);
        span.setAttribute("authorization.matched_bindings_count", decision.matched_bindings.length);
        span.setAttribute("authorization.traversal_hit_count", traversalHits.length);
        if (decision.deny_source !== undefined) {
            span.setAttribute("authorization.deny_policy_id", decision.deny_source.deny_policy_id);
        }
        recordAuthorizationDecisionLog(dependencies.decisionLogger, buildAuthorizationDecisionLogBindings("authorize.explain", input, decision));
        return {
            outcome: decision.outcome,
            decision_id: decision.decision_id,
            reason_code: decision.reason_code,
            matched_bindings: decision.matched_bindings.map(toMatchedBinding),
            deny_source: decision.deny_source !== undefined ? toDenySource(decision.deny_source) : undefined,
            trace: {
                allow_matches: snapshot.matched_bindings.map(toAllowMatch),
                deny_matches: snapshot.deny_policies.map(toDenyMatch),
                traversal_hits: traversalHits,
            },
        };
    });
};
