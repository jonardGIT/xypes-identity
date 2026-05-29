import assert from "node:assert/strict";
import test from "node:test";
import { authorizeCheck } from "./authorize-check.js";
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
        return [...this.expandGroupDepths(input).entries()]
            .map(([group_id, depth]) => ({
            group_id,
            depth,
            via_group_id: this.groupMemberships.find((membership) => membership.tenant_id === input.tenant_id && membership.group_id === group_id)?.member_group_id ?? null,
        }))
            .sort((left, right) => {
            if (left.depth !== right.depth) {
                return left.depth - right.depth;
            }
            const groupComparison = left.group_id.localeCompare(right.group_id);
            if (groupComparison !== 0) {
                return groupComparison;
            }
            return (left.via_group_id ?? "").localeCompare(right.via_group_id ?? "");
        });
    }
    expandGroupDepths(input) {
        const depths = new Map();
        const queue = this.groupMemberships
            .filter((membership) => membership.tenant_id === input.tenant_id
            && membership.member_principal_id === input.principal_id)
            .map((membership) => ({ group_id: membership.group_id, depth: 1 }));
        while (queue.length > 0) {
            const current = queue.shift();
            if (current === undefined) {
                continue;
            }
            const existingDepth = depths.get(current.group_id);
            if (existingDepth !== undefined && existingDepth <= current.depth) {
                continue;
            }
            depths.set(current.group_id, current.depth);
            if (current.depth >= this.maxDepth) {
                continue;
            }
            for (const membership of this.groupMemberships) {
                if (membership.tenant_id === input.tenant_id
                    && membership.member_group_id === current.group_id) {
                    queue.push({
                        group_id: membership.group_id,
                        depth: current.depth + 1,
                    });
                }
            }
        }
        return depths;
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
    nextId: () => "decision-allow-123",
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
test("authorizeCheck returns allow when a direct group membership binding matches", async () => {
    const result = await authorizeCheck(baseRequest, {
        authorizationRepository: new GraphAuthorizationRepository([
            {
                role_binding_id: "binding-1",
                role_definition_id: "role-1",
                permission_id: "permission-1",
                tenant_id: "tenant-1",
                subject_principal_id: null,
                subject_group_id: "group-1",
                action: "read",
                application_id: "application-1",
                resource_type: "document",
                scope_type: "resource",
                scope_application_id: "application-1",
                scope_resource_type: "document",
                scope_resource_id: "document-1",
            },
        ], [], [
            {
                tenant_id: "tenant-1",
                group_id: "group-1",
                member_principal_id: "principal-1",
                member_group_id: null,
            },
        ]),
        decisionIdGenerator: fixedDecisionIdGenerator,
    });
    assert.deepEqual(result, {
        outcome: "allow",
        decision_id: "decision-allow-123",
        reason_code: "ALLOW_MATCHED_BINDING",
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
        deny_source: undefined,
    });
});
test("authorizeCheck emits structured decision logs and span attributes", async () => {
    const telemetry = new RecordingAuthorizationTelemetry();
    const logEntries = [];
    const result = await authorizeCheck(baseRequest, {
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
    assert.equal(result.decision_id, "decision-allow-123");
    assert.deepEqual(logEntries, [
        {
            event_name: "authorization.decision",
            operation: "authorize.check",
            tenant_id: "tenant-1",
            principal_id: "principal-1",
            application_id: "application-1",
            action: "read",
            resource_type: "document",
            resource_id: "document-1",
            decision_id: "decision-allow-123",
            outcome: "allow",
            reason_code: "ALLOW_MATCHED_BINDING",
            matched_bindings_count: 1,
            deny_policy_id: null,
        },
    ]);
    assert.deepEqual(telemetry.spans, [
        {
            spanName: "authorization.authorize_check",
            attributes: {
                "authorization.operation": "authorize.check",
                "authorization.tenant_id": "tenant-1",
                "authorization.principal_id": "principal-1",
                "authorization.application_id": "application-1",
                "authorization.action": "read",
                "authorization.resource_type": "document",
                "authorization.resource_id": "document-1",
            },
            events: {
                "authorization.decision_id": "decision-allow-123",
                "authorization.outcome": "allow",
                "authorization.reason_code": "ALLOW_MATCHED_BINDING",
                "authorization.matched_bindings_count": 1,
                "authorization.decision_cache_status": "disabled",
            },
            recordedExceptions: [],
        },
    ]);
});
test("authorizeCheck records decision cache hit telemetry when the cache serves the snapshot", async () => {
    const telemetry = new RecordingAuthorizationTelemetry();
    const result = await authorizeCheck(baseRequest, {
        authorizationRepository: new GraphAuthorizationRepository([], [], []),
        decisionIdGenerator: fixedDecisionIdGenerator,
        decisionTelemetry: telemetry,
        authorizationCache: {
            authorizationDecisionCache: {
                get: async () => ({
                    matched_bindings: [
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
                            subject: {
                                subject_type: "principal",
                                subject_principal_id: "principal-1",
                                subject_group_id: null,
                                membership_depth: 0,
                            },
                        },
                    ],
                    deny_policies: [],
                }),
                set: async () => { },
            },
            authorizationExpansionCache: {
                get: async () => null,
                set: async () => { },
            },
            authorizationCacheVersionStore: {
                getTenantVersions: async () => ({
                    decision_version: 7,
                    expansion_version: 3,
                }),
                bumpTenantVersions: async () => { },
            },
        },
    });
    assert.equal(result.outcome, "allow");
    assert.equal(telemetry.spans[0]?.events["authorization.decision_cache_status"], "hit");
    assert.equal(telemetry.spans[0]?.events["authorization.decision_cache_version"], 7);
});
test("authorizeCheck returns deny when a broader group-derived deny matches an allow", async () => {
    const result = await authorizeCheck(baseRequest, {
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
        decision_id: "decision-allow-123",
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
    });
});
test("authorizeCheck returns allow when a nested group binding matches within the depth bound", async () => {
    const result = await authorizeCheck(baseRequest, {
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
        decision_id: "decision-allow-123",
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
    });
});
test("authorizeCheck returns deny when traversal beyond depth 16 does not reach a nested group binding", async () => {
    const deepMemberships = Array.from({ length: 17 }, (_, index) => {
        const groupNumber = index + 1;
        return {
            tenant_id: "tenant-1",
            group_id: `group-${groupNumber}`,
            member_principal_id: groupNumber === 1 ? "principal-1" : null,
            member_group_id: groupNumber === 1 ? null : `group-${groupNumber - 1}`,
        };
    });
    const result = await authorizeCheck(baseRequest, {
        authorizationRepository: new GraphAuthorizationRepository([
            {
                role_binding_id: "binding-depth-17",
                role_definition_id: "role-1",
                permission_id: "permission-1",
                tenant_id: "tenant-1",
                subject_principal_id: null,
                subject_group_id: "group-17",
                action: "read",
                application_id: "application-1",
                resource_type: "document",
                scope_type: "application",
                scope_application_id: "application-1",
                scope_resource_type: null,
                scope_resource_id: null,
            },
        ], [], deepMemberships),
        decisionIdGenerator: fixedDecisionIdGenerator,
    });
    assert.deepEqual(result, {
        outcome: "deny",
        decision_id: "decision-allow-123",
        reason_code: "NO_MATCHING_BINDING",
        matched_bindings: [],
        deny_source: undefined,
    });
});
test("authorizeCheck denies immediately when the principal is suspended", async () => {
    const result = await authorizeCheck({
        ...baseRequest,
        principal_id: "principal-suspended",
    }, {
        authorizationRepository: new GraphAuthorizationRepository([
            {
                role_binding_id: "binding-1",
                role_definition_id: "role-1",
                permission_id: "permission-1",
                tenant_id: "tenant-1",
                subject_principal_id: "principal-suspended",
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
        decision_id: "decision-allow-123",
        reason_code: "PRINCIPAL_SUSPENDED",
        matched_bindings: [],
    });
});
test("authorizeCheck denies immediately when the tenant membership is suspended", async () => {
    const result = await authorizeCheck({
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
        decision_id: "decision-allow-123",
        reason_code: "TENANT_MEMBERSHIP_SUSPENDED",
        matched_bindings: [],
    });
});
