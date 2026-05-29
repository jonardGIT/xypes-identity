import assert from "node:assert/strict";
import test from "node:test";
import { authorizeCheck } from "./authorize-check.js";
import { authorizeExplain } from "./authorize-explain.js";
class InMemoryAuthorizationDecisionCache {
    entries = new Map();
    async get(input) {
        return this.entries.get(JSON.stringify(input)) ?? null;
    }
    async set(input) {
        this.entries.set(JSON.stringify({
            request: input.request,
            versions: input.versions,
        }), input.snapshot);
    }
}
class InMemoryAuthorizationExpansionCache {
    entries = new Map();
    async get(input) {
        return this.entries.get(JSON.stringify(input)) ?? null;
    }
    async set(input) {
        this.entries.set(JSON.stringify({
            tenant_id: input.tenant_id,
            principal_id: input.principal_id,
            expansion_version: input.expansion_version,
        }), input.traversal_hits);
    }
}
class InMemoryAuthorizationCacheVersionStore {
    versions = new Map();
    async getTenantVersions(tenantId) {
        return this.versions.get(tenantId) ?? {
            decision_version: 0,
            expansion_version: 0,
        };
    }
    async bumpTenantVersions(input) {
        const currentVersions = await this.getTenantVersions(input.tenant_id);
        this.versions.set(input.tenant_id, {
            decision_version: input.decision_version
                ? currentVersions.decision_version + 1
                : currentVersions.decision_version,
            expansion_version: input.expansion_version
                ? currentVersions.expansion_version + 1
                : currentVersions.expansion_version,
        });
    }
}
class RecordingAuthorizationRepository {
    matchedBindings;
    denyPolicies;
    traversalHits;
    allowCalls = 0;
    denyCalls = 0;
    traversalCalls = 0;
    accessStateCalls = 0;
    principalAccessState = {
        principal_status: "active",
        tenant_membership_status: "active",
    };
    constructor(matchedBindings, denyPolicies, traversalHits) {
        this.matchedBindings = matchedBindings;
        this.denyPolicies = denyPolicies;
        this.traversalHits = traversalHits;
    }
    async findDirectPrincipalAllowBindings() {
        this.allowCalls += 1;
        return this.matchedBindings;
    }
    async findPrincipalAccessState() {
        this.accessStateCalls += 1;
        return this.principalAccessState;
    }
    async findDirectPrincipalDenyPolicies() {
        this.denyCalls += 1;
        return this.denyPolicies;
    }
    async findPrincipalGroupTraversalHits() {
        this.traversalCalls += 1;
        return this.traversalHits;
    }
}
const createAuthorizationCache = () => ({
    authorizationDecisionCache: new InMemoryAuthorizationDecisionCache(),
    authorizationExpansionCache: new InMemoryAuthorizationExpansionCache(),
    authorizationCacheVersionStore: new InMemoryAuthorizationCacheVersionStore(),
});
const createRequest = () => ({
    tenant_id: "tenant-1",
    principal_id: "principal-1",
    application_id: "application-1",
    action: "read",
    resource_type: "invoice",
    resource_id: "invoice-1",
});
const matchedBindings = [
    {
        role_binding_id: "binding-1",
        role_definition_id: "role-1",
        permission_id: "permission-1",
        scope_type: "resource",
        scope_application_id: "application-1",
        scope_resource_type: "invoice",
        scope_resource_id: "invoice-1",
        subject: {
            subject_type: "group",
            subject_principal_id: null,
            subject_group_id: "group-1",
            membership_depth: 1,
        },
    },
];
const traversalHits = [
    {
        group_id: "group-1",
        depth: 1,
        via_group_id: null,
    },
];
test("authorizeCheck reuses the cached evaluation snapshot and still emits a fresh decision id", async () => {
    const repository = new RecordingAuthorizationRepository(matchedBindings, [], traversalHits);
    const authorizationCache = createAuthorizationCache();
    const generatedDecisionIds = ["decision-1", "decision-2"];
    const responseOne = await authorizeCheck(createRequest(), {
        authorizationRepository: repository,
        authorizationCache,
        decisionIdGenerator: {
            nextId: () => {
                const nextId = generatedDecisionIds.shift();
                if (nextId === undefined) {
                    throw new Error("No more decision ids available.");
                }
                return nextId;
            },
        },
    });
    const responseTwo = await authorizeCheck(createRequest(), {
        authorizationRepository: repository,
        authorizationCache,
        decisionIdGenerator: {
            nextId: () => {
                const nextId = generatedDecisionIds.shift();
                if (nextId === undefined) {
                    throw new Error("No more decision ids available.");
                }
                return nextId;
            },
        },
    });
    assert.equal(repository.allowCalls, 1);
    assert.equal(repository.denyCalls, 1);
    assert.equal(responseOne.decision_id, "decision-1");
    assert.equal(responseTwo.decision_id, "decision-2");
    assert.equal(responseTwo.reason_code, "ALLOW_MATCHED_BINDING");
});
test("authorizeExplain re-fetches after a tenant cache version bump", async () => {
    const authorizationCache = createAuthorizationCache();
    const repository = new RecordingAuthorizationRepository(matchedBindings, [], traversalHits);
    const dependencies = {
        authorizationRepository: repository,
        authorizationCache,
        decisionIdGenerator: {
            nextId: () => "decision-1",
        },
    };
    await authorizeExplain(createRequest(), dependencies);
    await authorizeExplain(createRequest(), dependencies);
    assert.equal(repository.allowCalls, 1);
    assert.equal(repository.denyCalls, 1);
    assert.equal(repository.traversalCalls, 1);
    await authorizationCache.authorizationCacheVersionStore.bumpTenantVersions({
        tenant_id: "tenant-1",
        decision_version: true,
        expansion_version: true,
    });
    await authorizeExplain(createRequest(), dependencies);
    assert.equal(repository.allowCalls, 2);
    assert.equal(repository.denyCalls, 2);
    assert.equal(repository.traversalCalls, 2);
});
test("authorizeCheck denies suspended tenant memberships even when an allow snapshot is cached", async () => {
    const repository = new RecordingAuthorizationRepository(matchedBindings, [], traversalHits);
    const authorizationCache = createAuthorizationCache();
    const generatedDecisionIds = ["decision-1", "decision-2"];
    const dependencies = {
        authorizationRepository: repository,
        authorizationCache,
        decisionIdGenerator: {
            nextId: () => {
                const nextId = generatedDecisionIds.shift();
                if (nextId === undefined) {
                    throw new Error("No more decision ids available.");
                }
                return nextId;
            },
        },
    };
    const firstResponse = await authorizeCheck(createRequest(), dependencies);
    repository.principalAccessState = {
        principal_status: "active",
        tenant_membership_status: "suspended",
    };
    const secondResponse = await authorizeCheck(createRequest(), dependencies);
    assert.equal(firstResponse.reason_code, "ALLOW_MATCHED_BINDING");
    assert.equal(secondResponse.reason_code, "TENANT_MEMBERSHIP_SUSPENDED");
    assert.deepEqual(secondResponse.matched_bindings, []);
    assert.equal(repository.allowCalls, 1);
    assert.equal(repository.denyCalls, 1);
    assert.equal(repository.accessStateCalls, 2);
});
