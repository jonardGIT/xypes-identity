import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_GROUP_TRAVERSAL_DEPTH, PostgresAuthorizationRepository, } from "./postgres-authorization-repository.js";
class RecordingDatabaseClient {
    rowsByCall;
    calls = [];
    constructor(rowsByCall = []) {
        this.rowsByCall = rowsByCall;
    }
    async query(queryText, values) {
        this.calls.push({ queryText, values });
        return {
            rows: (this.rowsByCall[this.calls.length - 1] ?? []),
        };
    }
}
test("PostgresAuthorizationRepository only loads active role bindings for allow evaluation", async () => {
    const databaseClient = new RecordingDatabaseClient();
    const repository = new PostgresAuthorizationRepository(databaseClient);
    await repository.findDirectPrincipalAllowBindings({
        tenant_id: "tenant-1",
        principal_id: "principal-1",
        application_id: "application-1",
        action: "invoice.read",
        resource_type: "invoice",
        resource_id: "invoice-42",
    });
    assert.match(databaseClient.calls[0]?.queryText ?? "", /rb\.role_binding_status = 'active'/);
});
test("PostgresAuthorizationRepository queries principal and group-derived allow bindings with bounded traversal", async () => {
    const databaseClient = new RecordingDatabaseClient([[
            {
                role_binding_id: "binding-1",
                role_definition_id: "role-1",
                permission_id: "permission-1",
                scope_type: "application",
                scope_application_id: "application-1",
                scope_resource_type: null,
                scope_resource_id: null,
                subject_principal_id: "principal-1",
                subject_group_id: null,
                matched_depth: null,
                role_binding_status: "active",
            },
        ]]);
    const repository = new PostgresAuthorizationRepository(databaseClient);
    const result = await repository.findDirectPrincipalAllowBindings({
        tenant_id: "tenant-1",
        principal_id: "principal-1",
        application_id: "application-1",
        action: "read",
        resource_type: "document",
        resource_id: "document-1",
    });
    assert.deepEqual(result, [
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
    ]);
    assert.equal(databaseClient.calls.length, 1);
    assert.match(databaseClient.calls[0]?.queryText ?? "", /WITH RECURSIVE expanded_groups AS/i);
    assert.match(databaseClient.calls[0]?.queryText ?? "", /FROM group_membership AS gm/i);
    assert.match(databaseClient.calls[0]?.queryText ?? "", /FROM role_binding AS rb/i);
    assert.match(databaseClient.calls[0]?.queryText ?? "", /LEFT JOIN resolved_groups AS rg/i);
    assert.match(databaseClient.calls[0]?.queryText ?? "", /rb\.subject_principal_id = \$2 OR rg\.group_id IS NOT NULL/i);
    assert.deepEqual(databaseClient.calls[0]?.values, [
        "tenant-1",
        "principal-1",
        "application-1",
        "document-1",
        "document",
        "read",
        DEFAULT_GROUP_TRAVERSAL_DEPTH,
    ]);
});
test("PostgresAuthorizationRepository loads principal and tenant membership suspension state", async () => {
    const databaseClient = new RecordingDatabaseClient([[
            {
                principal_status: "active",
                tenant_membership_status: "suspended",
            },
        ]]);
    const repository = new PostgresAuthorizationRepository(databaseClient);
    const result = await repository.findPrincipalAccessState({
        tenant_id: "tenant-1",
        principal_id: "principal-1",
        application_id: "application-1",
        action: "read",
        resource_type: "document",
        resource_id: "document-1",
    });
    assert.deepEqual(result, {
        principal_status: "active",
        tenant_membership_status: "suspended",
    });
    assert.equal(databaseClient.calls.length, 1);
    assert.match(databaseClient.calls[0]?.queryText ?? "", /FROM principal/i);
    assert.match(databaseClient.calls[0]?.queryText ?? "", /LEFT JOIN tenant_membership/i);
    assert.deepEqual(databaseClient.calls[0]?.values, ["tenant-1", "principal-1"]);
});
test("PostgresAuthorizationRepository queries principal and group-derived deny policies with bounded traversal", async () => {
    const databaseClient = new RecordingDatabaseClient([[
            {
                deny_policy_id: "deny-1",
                permission_id: "permission-1",
                scope_type: "tenant",
                scope_application_id: null,
                scope_resource_type: null,
                scope_resource_id: null,
                reason: "Tenant-wide deny",
                subject_principal_id: "principal-1",
                subject_group_id: null,
                matched_depth: null,
            },
        ]]);
    const repository = new PostgresAuthorizationRepository(databaseClient);
    const result = await repository.findDirectPrincipalDenyPolicies({
        tenant_id: "tenant-1",
        principal_id: "principal-1",
        application_id: "application-1",
        action: "read",
        resource_type: "document",
        resource_id: "document-1",
    });
    assert.deepEqual(result, [
        {
            deny_policy_id: "deny-1",
            permission_id: "permission-1",
            scope_type: "tenant",
            scope_application_id: null,
            scope_resource_type: null,
            scope_resource_id: null,
            reason: "Tenant-wide deny",
            subject: {
                subject_type: "principal",
                subject_principal_id: "principal-1",
                subject_group_id: null,
                membership_depth: null,
            },
        },
    ]);
    assert.equal(databaseClient.calls.length, 1);
    assert.match(databaseClient.calls[0]?.queryText ?? "", /WITH RECURSIVE expanded_groups AS/i);
    assert.match(databaseClient.calls[0]?.queryText ?? "", /FROM group_membership AS gm/i);
    assert.match(databaseClient.calls[0]?.queryText ?? "", /FROM deny_policy AS dp/i);
    assert.match(databaseClient.calls[0]?.queryText ?? "", /LEFT JOIN resolved_groups AS rg/i);
    assert.match(databaseClient.calls[0]?.queryText ?? "", /dp\.subject_principal_id = \$2 OR rg\.group_id IS NOT NULL/i);
    assert.deepEqual(databaseClient.calls[0]?.values, [
        "tenant-1",
        "principal-1",
        "application-1",
        "document-1",
        "document",
        "read",
        DEFAULT_GROUP_TRAVERSAL_DEPTH,
    ]);
});
