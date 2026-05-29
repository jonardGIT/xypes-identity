import assert from "node:assert/strict";
import test from "node:test";
import { authorizeExplain } from "./authorize-explain.js";
const scopeRank = {
    platform: 0,
    tenant: 1,
    application: 2,
    resource: 3,
};
const matchesScope = (record, input) => {
    if (record.scope_type === "platform" || record.scope_type === "tenant") {
        return true;
    }
    if (record.scope_type === "application") {
        return record.scope_application_id === input.application_id;
    }
    return (record.scope_application_id === input.application_id
        && record.scope_resource_type === input.resource_type
        && input.resource_id !== null
        && record.scope_resource_id === input.resource_id);
};
class GraphAuthorizationRepository {
    bindings;
    denyPolicies;
    groupMemberships;
    maxDepth;
    constructor(bindings, denyPolicies, groupMemberships, maxDepth = 16) {
        this.bindings = bindings;
        this.denyPolicies = denyPolicies;
        this.groupMemberships = groupMemberships;
        this.maxDepth = maxDepth;
    }
    async findDirectPrincipalAllowBindings(input) {
        const groupDepths = this.expandGroupDepths(input);
        return this.bindings
            .filter((binding) => this.matchesBinding(binding, input, groupDepths))
            .sort((left, right) => this.compareSubjects(left, right, groupDepths))
            .map((binding) => ({
            role_binding_id: binding.role_binding_id,
            role_definition_id: binding.role_definition_id,
            permission_id: binding.permission_id,
            scope_type: binding.scope_type,
            scope_application_id: binding.scope_application_id,
            scope_resource_type: binding.scope_resource_type,
            scope_resource_id: binding.scope_resource_id,
            subject: {
                subject_type: binding.subject_principal_id !== null ? "principal" : "group",
                subject_principal_id: binding.subject_principal_id,
                subject_group_id: binding.subject_group_id,
                membership_depth: binding.subject_principal_id !== null
                    ? null
                    : groupDepths.get(binding.subject_group_id ?? "") ?? null,
            },
        }));
    }
    async findDirectPrincipalDenyPolicies(input) {
        const groupDepths = this.expandGroupDepths(input);
        return this.denyPolicies
            .filter((denyPolicy) => this.matchesDeny(denyPolicy, input, groupDepths))
            .sort((left, right) => this.compareSubjects(left, right, groupDepths))
            .map((denyPolicy) => ({
            deny_policy_id: denyPolicy.deny_policy_id,
            permission_id: denyPolicy.permission_id,
            scope_type: denyPolicy.scope_type,
            scope_application_id: denyPolicy.scope_application_id,
            scope_resource_type: denyPolicy.scope_resource_type,
            scope_resource_id: denyPolicy.scope_resource_id,
            reason: denyPolicy.reason,
            subject: {
                subject_type: denyPolicy.subject_principal_id !== null ? "principal" : "group",
                subject_principal_id: denyPolicy.subject_principal_id,
                subject_group_id: denyPolicy.subject_group_id,
                membership_depth: denyPolicy.subject_principal_id !== null
                    ? null
                    : groupDepths.get(denyPolicy.subject_group_id ?? "") ?? null,
            },
        }));
    }
    async findPrincipalGroupTraversalHits(input) {
        return this.expandTraversalHits(input);
    }
    expandGroupDepths(input) {
        return new Map(this.expandTraversalHits(input).map((hit) => [hit.group_id, hit.depth]));
    }
    expandTraversalHits(input) {
        const hits = new Map();
        const queue = this.groupMemberships
            .filter((membership) => membership.tenant_id === input.tenant_id
            && membership.member_principal_id === input.principal_id)
            .map((membership) => ({
            group_id: membership.group_id,
            depth: 1,
            via_group_id: null,
        }));
        while (queue.length > 0) {
            const current = queue.shift();
            if (current === undefined) {
                continue;
            }
            const existingHit = hits.get(current.group_id);
            if (existingHit !== undefined
                && (existingHit.depth < current.depth
                    || (existingHit.depth === current.depth
                        && (existingHit.via_group_id ?? "") <= (current.via_group_id ?? "")))) {
                continue;
            }
            hits.set(current.group_id, {
                depth: current.depth,
                via_group_id: current.via_group_id,
            });
            if (current.depth >= this.maxDepth) {
                continue;
            }
            for (const membership of this.groupMemberships) {
                if (membership.tenant_id === input.tenant_id
                    && membership.member_group_id === current.group_id) {
                    queue.push({
                        group_id: membership.group_id,
                        depth: current.depth + 1,
                        via_group_id: membership.member_group_id,
                    });
                }
            }
        }
        return [...hits.entries()]
            .map(([group_id, hit]) => ({
            group_id,
            depth: hit.depth,
            via_group_id: hit.via_group_id,
        }))
            .sort((left, right) => {
            if (left.depth !== right.depth) {
                return left.depth - right.depth;
            }
            const groupIdComparison = left.group_id.localeCompare(right.group_id);
            if (groupIdComparison !== 0) {
                return groupIdComparison;
            }
            return (left.via_group_id ?? "").localeCompare(right.via_group_id ?? "");
        });
    }
    matchesBinding(binding, input, groupDepths) {
        return (binding.tenant_id === input.tenant_id
            && binding.application_id === input.application_id
            && binding.action === input.action
            && binding.resource_type === input.resource_type
            && this.matchesSubject(binding.subject_principal_id, binding.subject_group_id, input, groupDepths)
            && matchesScope(binding, input));
    }
    matchesDeny(denyPolicy, input, groupDepths) {
        return (denyPolicy.tenant_id === input.tenant_id
            && denyPolicy.application_id === input.application_id
            && denyPolicy.action === input.action
            && denyPolicy.resource_type === input.resource_type
            && this.matchesSubject(denyPolicy.subject_principal_id, denyPolicy.subject_group_id, input, groupDepths)
            && matchesScope(denyPolicy, input));
    }
    matchesSubject(subjectPrincipalId, subjectGroupId, input, groupDepths) {
        return (subjectPrincipalId === input.principal_id
            || (subjectGroupId !== null && groupDepths.has(subjectGroupId)));
    }
    compareSubjects(left, right, groupDepths) {
        const scopeDifference = scopeRank[left.scope_type] - scopeRank[right.scope_type];
        if (scopeDifference !== 0) {
            return scopeDifference;
        }
        const leftSubjectRank = left.subject_principal_id !== null ? 0 : 1;
        const rightSubjectRank = right.subject_principal_id !== null ? 0 : 1;
        if (leftSubjectRank !== rightSubjectRank) {
            return leftSubjectRank - rightSubjectRank;
        }
        const leftDepth = left.subject_group_id === null ? 0 : (groupDepths.get(left.subject_group_id) ?? Number.MAX_SAFE_INTEGER);
        const rightDepth = right.subject_group_id === null ? 0 : (groupDepths.get(right.subject_group_id) ?? Number.MAX_SAFE_INTEGER);
        if (leftDepth !== rightDepth) {
            return leftDepth - rightDepth;
        }
        return (left.role_binding_id ?? left.deny_policy_id ?? "").localeCompare(right.role_binding_id ?? right.deny_policy_id ?? "");
    }
    async findPrincipalAccessState(input) {
        const principalSuspended = input.principal_id === "principal-suspended";
        const membershipSuspended = input.principal_id === "principal-membership-suspended";
        if (!principalSuspended && !membershipSuspended) {
            return {
                principal_status: "active",
                tenant_membership_status: "active",
            };
        }
        return {
            principal_status: principalSuspended ? "suspended" : "active",
            tenant_membership_status: membershipSuspended ? "suspended" : "active",
        };
    }
}
const fixedDecisionIdGenerator = {
    nextId: () => "decision-explain-123",
};
const baseRequest = {
    tenant_id: "tenant-1",
    principal_id: "principal-1",
    application_id: "application-1",
    action: "read",
    resource_type: "document",
    resource_id: "document-1",
};
class RecordingAuthorizationTelemetry {
    spans = [];
    async runInSpan(spanName, attributes, callback) {
        const spanState = {
            spanName,
            attributes: Object.fromEntries(Object.entries(attributes).filter((entry) => entry[1] !== undefined && entry[1] !== null)),
            events: {},
            recordedExceptions: [],
        };
        this.spans.push(spanState);
        return callback({
            setAttribute: (name, value) => {
                spanState.events[name] = value;
            },
            recordException: (error) => {
                spanState.recordedExceptions.push(error);
            },
        });
    }
}
test("authorizeExplain returns nested group allow trace data", async () => {
    const result = await authorizeExplain(baseRequest, {
        authorizationRepository: new GraphAuthorizationRepository([
            {
                role_binding_id: "binding-nested-1",
                role_definition_id: "role-1",
                permission_id: "permission-1",
                tenant_id: "tenant-1",
                subject_principal_id: null,
                subject_group_id: "group-2",
                action: "read",
                application_id: "application-1",
                resource_type: "document",
                scope_type: "application",
                scope_application_id: "application-1",
                scope_resource_type: null,
                scope_resource_id: null,
            },
        ], [], [
            {
                tenant_id: "tenant-1",
                group_id: "group-1",
                member_principal_id: "principal-1",
                member_group_id: null,
            },
            {
                tenant_id: "tenant-1",
                group_id: "group-2",
                member_principal_id: null,
                member_group_id: "group-1",
            },
        ]),
        decisionIdGenerator: fixedDecisionIdGenerator,
    });
    assert.deepEqual(result, {
        outcome: "allow",
        decision_id: "decision-explain-123",
        reason_code: "ALLOW_MATCHED_BINDING",
        matched_bindings: [
            {
                role_binding_id: "binding-nested-1",
                role_definition_id: "role-1",
                permission_id: "permission-1",
                scope_type: "application",
                scope_application_id: "application-1",
                scope_resource_type: null,
                scope_resource_id: null,
            },
        ],
        deny_source: undefined,
        trace: {
            allow_matches: [
                {
                    role_binding_id: "binding-nested-1",
                    subject: {
                        subject_type: "group",
                        subject_principal_id: null,
                        subject_group_id: "group-2",
                        membership_depth: 2,
                    },
                },
            ],
            deny_matches: [],
            traversal_hits: [
                {
                    group_id: "group-1",
                    depth: 1,
                    via_group_id: null,
                },
                {
                    group_id: "group-2",
                    depth: 2,
                    via_group_id: "group-1",
                },
            ],
        },
    });
});
test("authorizeExplain returns deny explanation when a broader deny overrides allow", async () => {
    const result = await authorizeExplain(baseRequest, {
        authorizationRepository: new GraphAuthorizationRepository([
            {
                role_binding_id: "binding-1",
                role_definition_id: "role-1",
                permission_id: "permission-1",
                tenant_id: "tenant-1",
                subject_principal_id: "principal-1",
                subject_group_id: null,
                action: "read",
                application_id: "application-1",
                resource_type: "document",
                scope_type: "resource",
                scope_application_id: "application-1",
                scope_resource_type: "document",
                scope_resource_id: "document-1",
            },
        ], [
            {
                deny_policy_id: "deny-tenant-1",
                permission_id: "permission-1",
                tenant_id: "tenant-1",
                subject_principal_id: null,
                subject_group_id: "group-deny",
                action: "read",
                application_id: "application-1",
                resource_type: "document",
                scope_type: "tenant",
                scope_application_id: null,
                scope_resource_type: null,
                scope_resource_id: null,
                reason: "Tenant-wide suspension",
            },
        ], [
            {
                tenant_id: "tenant-1",
                group_id: "group-deny",
                member_principal_id: "principal-1",
                member_group_id: null,
            },
        ]),
        decisionIdGenerator: fixedDecisionIdGenerator,
    });
    assert.deepEqual(result, {
        outcome: "deny",
        decision_id: "decision-explain-123",
        reason_code: "DENY_MATCHED_POLICY",
        matched_bindings: [
            {
                role_binding_id: "binding-1",
                role_definition_id: "role-1",
                permission_id: "permission-1",
                scope_type: "resource",
                scope_application_id: "application-1",
                scope_resource_type: "document",
                scope_resource_id: "document-1",
            },
        ],
        deny_source: {
            deny_policy_id: "deny-tenant-1",
            permission_id: "permission-1",
            scope_type: "tenant",
            scope_application_id: null,
            scope_resource_type: null,
            scope_resource_id: null,
            reason: "Tenant-wide suspension",
        },
        trace: {
            allow_matches: [
                {
                    role_binding_id: "binding-1",
                    subject: {
                        subject_type: "principal",
                        subject_principal_id: "principal-1",
                        subject_group_id: null,
                        membership_depth: null,
                    },
                },
            ],
            deny_matches: [
                {
                    deny_policy_id: "deny-tenant-1",
                    subject: {
                        subject_type: "group",
                        subject_principal_id: null,
                        subject_group_id: "group-deny",
                        membership_depth: 1,
                    },
                },
            ],
            traversal_hits: [
                {
                    group_id: "group-deny",
                    depth: 1,
                    via_group_id: null,
                },
            ],
        },
    });
});
test("authorizeExplain emits structured decision logs and span attributes", async () => {
    const telemetry = new RecordingAuthorizationTelemetry();
    const logEntries = [];
    const result = await authorizeExplain(baseRequest, {
        authorizationRepository: new GraphAuthorizationRepository([
            {
                role_binding_id: "binding-1",
                role_definition_id: "role-1",
                permission_id: "permission-1",
                tenant_id: "tenant-1",
                subject_principal_id: "principal-1",
                subject_group_id: null,
                action: "read",
                application_id: "application-1",
                resource_type: "document",
                scope_type: "resource",
                scope_application_id: "application-1",
                scope_resource_type: "document",
                scope_resource_id: "document-1",
            },
        ], [], []),
        decisionIdGenerator: fixedDecisionIdGenerator,
        decisionLogger: {
            info: (bindings) => {
                logEntries.push(bindings);
            },
        },
        decisionTelemetry: telemetry,
    });
    assert.equal(result.decision_id, "decision-explain-123");
    assert.deepEqual(logEntries, [
        {
            event_name: "authorization.decision",
            operation: "authorize.explain",
            tenant_id: "tenant-1",
            principal_id: "principal-1",
            application_id: "application-1",
            action: "read",
            resource_type: "document",
            resource_id: "document-1",
            decision_id: "decision-explain-123",
            outcome: "allow",
            reason_code: "ALLOW_MATCHED_BINDING",
            matched_bindings_count: 1,
            deny_policy_id: null,
        },
    ]);
    assert.deepEqual(telemetry.spans, [
        {
            spanName: "authorization.authorize_explain",
            attributes: {
                "authorization.operation": "authorize.explain",
                "authorization.tenant_id": "tenant-1",
                "authorization.principal_id": "principal-1",
                "authorization.application_id": "application-1",
                "authorization.action": "read",
                "authorization.resource_type": "document",
                "authorization.resource_id": "document-1",
            },
            events: {
                "authorization.decision_id": "decision-explain-123",
                "authorization.outcome": "allow",
                "authorization.reason_code": "ALLOW_MATCHED_BINDING",
                "authorization.matched_bindings_count": 1,
                "authorization.traversal_hit_count": 0,
                "authorization.decision_cache_status": "disabled",
                "authorization.expansion_cache_status": "disabled",
            },
            recordedExceptions: [],
        },
    ]);
});
test("authorizeExplain returns a suspension-specific deny trace when the tenant membership is suspended", async () => {
    const result = await authorizeExplain({
        ...baseRequest,
        principal_id: "principal-membership-suspended",
    }, {
        authorizationRepository: new GraphAuthorizationRepository([
            {
                role_binding_id: "binding-1",
                role_definition_id: "role-1",
                permission_id: "permission-1",
                tenant_id: "tenant-1",
                subject_principal_id: "principal-membership-suspended",
                subject_group_id: null,
                action: "read",
                application_id: "application-1",
                resource_type: "document",
                scope_type: "resource",
                scope_application_id: "application-1",
                scope_resource_type: "document",
                scope_resource_id: "document-1",
            },
        ], [], []),
        decisionIdGenerator: fixedDecisionIdGenerator,
    });
    assert.deepEqual(result, {
        outcome: "deny",
        decision_id: "decision-explain-123",
        reason_code: "TENANT_MEMBERSHIP_SUSPENDED",
        matched_bindings: [],
        trace: {
            allow_matches: [],
            deny_matches: [],
            traversal_hits: [],
        },
    });
});
