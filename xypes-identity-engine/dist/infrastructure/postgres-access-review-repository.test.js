import assert from "node:assert/strict";
import test from "node:test";
import { PostgresAccessReviewRepository } from "./postgres-access-review-repository.js";
class RecordingPool {
    responses;
    calls = [];
    constructor(responses) {
        this.responses = responses;
    }
    async query(queryText, values) {
        this.calls.push({ queryText, values });
        const response = this.responses.shift() ?? { rows: [] };
        return { rows: response.rows };
    }
}
test("PostgresAccessReviewRepository maps stale groups, orphaned owners, stale bindings, and privileged bindings", async () => {
    const pool = new RecordingPool([
        {
            rows: [
                {
                    group_id: "group-stale",
                    name: "finance-reviewers",
                    group_type: "manual",
                    owner_principal_id: "principal-owner",
                    scope_type: "tenant",
                    scope_application_id: null,
                    scope_resource_type: null,
                    scope_resource_id: null,
                    updated_at: "2026-03-01T00:00:00.000Z",
                },
            ],
        },
        {
            rows: [
                {
                    group_id: "group-orphaned",
                    name: "billing-admins",
                    group_type: "manual",
                    owner_principal_id: "principal-missing",
                    scope_type: "application",
                    scope_application_id: "app-1",
                    scope_resource_type: null,
                    scope_resource_id: null,
                    updated_at: "2026-05-01T00:00:00.000Z",
                },
            ],
        },
        {
            rows: [
                {
                    role_binding_id: "binding-stale",
                    role_binding_status: "active",
                    role_definition_id: "role-1",
                    role_definition_name: "Finance Reviewer",
                    role_definition_status: "active",
                    approval_required: false,
                    subject_principal_id: "principal-1",
                    subject_group_id: null,
                    scope_type: "application",
                    scope_application_id: "app-1",
                    scope_resource_type: null,
                    scope_resource_id: null,
                    updated_at: "2026-03-02T00:00:00.000Z",
                    permission_ids: ["permission-1"],
                },
            ],
        },
        {
            rows: [
                {
                    role_binding_id: "binding-privileged",
                    role_binding_status: "eligible",
                    role_definition_id: "role-2",
                    role_definition_name: "Break Glass Admin",
                    role_definition_status: "active",
                    approval_required: true,
                    subject_principal_id: null,
                    subject_group_id: "group-privileged",
                    scope_type: "tenant",
                    scope_application_id: null,
                    scope_resource_type: null,
                    scope_resource_id: null,
                    updated_at: "2026-05-05T00:00:00.000Z",
                    permission_ids: ["permission-10", "permission-9"],
                },
            ],
        },
    ]);
    const repository = new PostgresAccessReviewRepository(pool);
    const findings = await repository.listFindings({
        tenant_id: "tenant-1",
        stale_cutoff_at: "2026-04-28T12:00:00.000Z",
        finding_codes: [
            "STALE_GROUP",
            "ORPHANED_GROUP_OWNER",
            "STALE_ROLE_BINDING",
            "PRIVILEGED_ROLE_BINDING",
        ],
    });
    assert.deepEqual(findings.map((finding) => finding.code), [
        "STALE_GROUP",
        "ORPHANED_GROUP_OWNER",
        "STALE_ROLE_BINDING",
        "PRIVILEGED_ROLE_BINDING",
    ]);
    assert.deepEqual(findings[0], {
        finding_id: "STALE_GROUP:group-stale",
        code: "STALE_GROUP",
        severity: "medium",
        entity_type: "group",
        entity_id: "group-stale",
        title: "Group finance-reviewers is stale",
        detail: "The manual group has not been updated since 2026-03-01T00:00:00.000Z.",
        evidence_ids: ["group-stale"],
        observed_at: "2026-03-01T00:00:00.000Z",
        scope_type: "tenant",
        scope_application_id: null,
        scope_resource_type: null,
        scope_resource_id: null,
        owner_principal_id: "principal-owner",
        subject_principal_id: null,
        subject_group_id: null,
        role_binding_status: null,
        role_definition_id: null,
        role_definition_name: null,
        role_definition_status: null,
        approval_required: null,
        permission_ids: [],
    });
    assert.deepEqual(findings[1]?.evidence_ids, ["group-orphaned", "principal-missing"]);
    assert.deepEqual(findings[2]?.evidence_ids, ["binding-stale", "role-1"]);
    assert.equal(findings[2]?.role_binding_status, "active");
    assert.deepEqual(findings[3]?.permission_ids, ["permission-10", "permission-9"]);
    assert.equal(findings[3]?.role_binding_status, "eligible");
    assert.match(findings[3]?.detail ?? "", /eligible only/i);
    assert.match(pool.calls[0]?.queryText ?? "", /FROM "group" AS g/i);
    assert.deepEqual(pool.calls[0]?.values, ["tenant-1", "2026-04-28T12:00:00.000Z"]);
});
test("PostgresAccessReviewRepository only executes requested finding queries", async () => {
    const pool = new RecordingPool([
        {
            rows: [
                {
                    group_id: "group-orphaned",
                    name: "billing-admins",
                    group_type: "manual",
                    owner_principal_id: "principal-missing",
                    scope_type: "tenant",
                    scope_application_id: null,
                    scope_resource_type: null,
                    scope_resource_id: null,
                    updated_at: "2026-05-01T00:00:00.000Z",
                },
            ],
        },
    ]);
    const repository = new PostgresAccessReviewRepository(pool);
    const findings = await repository.listFindings({
        tenant_id: "tenant-1",
        stale_cutoff_at: "2026-04-28T12:00:00.000Z",
        finding_codes: ["ORPHANED_GROUP_OWNER"],
    });
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.code, "ORPHANED_GROUP_OWNER");
    assert.equal(pool.calls.length, 1);
    assert.match(pool.calls[0]?.queryText ?? "", /LEFT JOIN tenant_membership AS tm/i);
});
test("PostgresAccessReviewRepository surfaces eligible privileged bindings as non-effective review findings", async () => {
    const pool = new RecordingPool([
        {
            rows: [
                {
                    role_binding_id: "binding-1",
                    role_binding_status: "eligible",
                    role_definition_id: "role-1",
                    role_definition_name: "Finance Admin",
                    role_definition_status: "active",
                    approval_required: true,
                    subject_principal_id: "principal-1",
                    subject_group_id: null,
                    scope_type: "application",
                    scope_application_id: "application-1",
                    scope_resource_type: null,
                    scope_resource_id: null,
                    updated_at: "2026-05-10T00:00:00.000Z",
                    permission_ids: ["permission-1", "permission-2"],
                },
            ],
        },
    ]);
    const repository = new PostgresAccessReviewRepository(pool);
    const findings = await repository.listFindings({
        tenant_id: "tenant-1",
        stale_cutoff_at: "2026-04-28T12:00:00.000Z",
        finding_codes: ["PRIVILEGED_ROLE_BINDING"],
    });
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.role_binding_status, "eligible");
    assert.match(findings[0]?.detail ?? "", /eligible only/i);
    assert.deepEqual(findings[0]?.permission_ids, ["permission-1", "permission-2"]);
});
