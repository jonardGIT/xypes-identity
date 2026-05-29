import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../app.js";
class InMemoryAuthorizationRepository {
    matchedBindings;
    denyPolicies;
    traversalHits;
    principalAccessState;
    constructor(matchedBindings, denyPolicies, traversalHits, principalAccessState = {
        principal_status: "active",
        tenant_membership_status: "active",
    }) {
        this.matchedBindings = matchedBindings;
        this.denyPolicies = denyPolicies;
        this.traversalHits = traversalHits;
        this.principalAccessState = principalAccessState;
    }
    async findPrincipalAccessState(_input) {
        return this.principalAccessState;
    }
    async findDirectPrincipalAllowBindings(_input) {
        return this.matchedBindings;
    }
    async findDirectPrincipalDenyPolicies(_input) {
        return this.denyPolicies;
    }
    async findPrincipalGroupTraversalHits(_input) {
        return this.traversalHits;
    }
}
test("POST /v1/authorize/explain returns deterministic trace data for a nested group allow", async (t) => {
    const app = await buildApp({
        authorizationCheck: {
            authorizationRepository: new InMemoryAuthorizationRepository([
                {
                    role_binding_id: "binding-1",
                    role_definition_id: "role-1",
                    permission_id: "permission-1",
                    scope_type: "application",
                    scope_application_id: "application-1",
                    scope_resource_type: null,
                    scope_resource_id: null,
                    subject: {
                        subject_type: "group",
                        subject_principal_id: null,
                        subject_group_id: "group-2",
                        membership_depth: 2,
                    },
                },
            ], [], [
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
            ]),
            decisionIdGenerator: {
                nextId: () => "decision-explain-route-123",
            },
        },
        principalRepository: {
            async findBySubject() {
                throw new Error("unused in this test");
            },
            async findTenantMembership() {
                throw new Error("unused in this test");
            },
        },
        tokenVerifier: {
            async verify() {
                throw new Error("unused in this test");
            },
        },
        auditPublisher: {
            async publish() {
                throw new Error("unused in this test");
            },
        },
        decisionIdGenerator: {
            nextId: () => "unused",
        },
        clock: {
            now: () => new Date("2026-05-28T00:00:00.000Z"),
        },
    });
    t.after(async () => {
        await app.close();
    });
    const response = await app.inject({
        method: "POST",
        url: "/v1/authorize/explain",
        payload: {
            tenant_id: "tenant-1",
            principal_id: "principal-1",
            application_id: "application-1",
            action: "read",
            resource_type: "document",
            resource_id: "document-1",
        },
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
        outcome: "allow",
        decision_id: "decision-explain-route-123",
        reason_code: "ALLOW_MATCHED_BINDING",
        matched_bindings: [
            {
                role_binding_id: "binding-1",
                role_definition_id: "role-1",
                permission_id: "permission-1",
                scope_type: "application",
                scope_application_id: "application-1",
                scope_resource_type: null,
                scope_resource_id: null,
            },
        ],
        deny_source: null,
        trace: {
            allow_matches: [
                {
                    role_binding_id: "binding-1",
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
test("POST /v1/authorize/explain returns an empty trace when the principal is suspended", async (t) => {
    const app = await buildApp({
        authorizationCheck: {
            authorizationRepository: new InMemoryAuthorizationRepository([
                {
                    role_binding_id: "binding-1",
                    role_definition_id: "role-1",
                    permission_id: "permission-1",
                    scope_type: "application",
                    scope_application_id: "application-1",
                    scope_resource_type: null,
                    scope_resource_id: null,
                    subject: {
                        subject_type: "principal",
                        subject_principal_id: "principal-1",
                        subject_group_id: null,
                        membership_depth: null,
                    },
                },
            ], [], [], {
                principal_status: "suspended",
                tenant_membership_status: "active",
            }),
            decisionIdGenerator: {
                nextId: () => "decision-explain-suspended-123",
            },
        },
        principalRepository: {
            async findBySubject() {
                throw new Error("unused in this test");
            },
            async findTenantMembership() {
                throw new Error("unused in this test");
            },
        },
        tokenVerifier: {
            async verify() {
                throw new Error("unused in this test");
            },
        },
        auditPublisher: {
            async publish() {
                throw new Error("unused in this test");
            },
        },
        decisionIdGenerator: {
            nextId: () => "unused",
        },
        clock: {
            now: () => new Date("2026-05-28T00:00:00.000Z"),
        },
    });
    t.after(async () => {
        await app.close();
    });
    const response = await app.inject({
        method: "POST",
        url: "/v1/authorize/explain",
        payload: {
            tenant_id: "tenant-1",
            principal_id: "principal-1",
            application_id: "application-1",
            action: "read",
            resource_type: "document",
            resource_id: "document-1",
        },
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
        outcome: "deny",
        decision_id: "decision-explain-suspended-123",
        reason_code: "PRINCIPAL_SUSPENDED",
        matched_bindings: [],
        deny_source: null,
        trace: {
            allow_matches: [],
            deny_matches: [],
            traversal_hits: [],
        },
    });
});
