import assert from "node:assert/strict";
import test from "node:test";
import { listAccessReviewFindings } from "./list-access-review-findings.js";
class RecordingAccessReviewRepository {
    findings;
    input = null;
    constructor(findings) {
        this.findings = findings;
    }
    async listFindings(input) {
        this.input = input;
        return this.findings;
    }
}
test("listAccessReviewFindings computes cutoff, normalizes codes, and sorts high-severity findings first", async () => {
    const repository = new RecordingAccessReviewRepository([
        {
            finding_id: "STALE_GROUP:group-1",
            code: "STALE_GROUP",
            severity: "medium",
            entity_type: "group",
            entity_id: "group-1",
            title: "stale",
            detail: "stale",
            evidence_ids: ["group-1"],
            observed_at: "2026-05-01T00:00:00.000Z",
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
        },
        {
            finding_id: "ORPHANED_GROUP_OWNER:group-2",
            code: "ORPHANED_GROUP_OWNER",
            severity: "high",
            entity_type: "group",
            entity_id: "group-2",
            title: "orphaned",
            detail: "orphaned",
            evidence_ids: ["group-2", "principal-2"],
            observed_at: "2026-05-02T00:00:00.000Z",
            scope_type: "tenant",
            scope_application_id: null,
            scope_resource_type: null,
            scope_resource_id: null,
            owner_principal_id: "principal-2",
            subject_principal_id: null,
            subject_group_id: null,
            role_binding_status: null,
            role_definition_id: null,
            role_definition_name: null,
            role_definition_status: null,
            approval_required: null,
            permission_ids: [],
        },
    ]);
    const response = await listAccessReviewFindings({
        tenant_id: "tenant-1",
        stale_after_days: 30,
        finding_codes: ["STALE_GROUP", "ORPHANED_GROUP_OWNER", "STALE_GROUP"],
    }, {
        accessReviewRepository: repository,
        clock: {
            now: () => new Date("2026-05-28T12:00:00.000Z"),
        },
    });
    assert.deepEqual(repository.input, {
        tenant_id: "tenant-1",
        stale_cutoff_at: "2026-04-28T12:00:00.000Z",
        finding_codes: ["ORPHANED_GROUP_OWNER", "STALE_GROUP"],
    });
    assert.equal(response.generated_at, "2026-05-28T12:00:00.000Z");
    assert.equal(response.stale_cutoff_at, "2026-04-28T12:00:00.000Z");
    assert.deepEqual(response.findings.map((finding) => finding.code), [
        "ORPHANED_GROUP_OWNER",
        "STALE_GROUP",
    ]);
});
test("listAccessReviewFindings applies the requested limit", async () => {
    const findings = [0, 1, 2].map((index) => ({
        finding_id: `PRIVILEGED_ROLE_BINDING:binding-${index}`,
        code: "PRIVILEGED_ROLE_BINDING",
        severity: "high",
        entity_type: "role_binding",
        entity_id: `binding-${index}`,
        title: "privileged",
        detail: "privileged",
        evidence_ids: [`binding-${index}`],
        observed_at: "2026-05-01T00:00:00.000Z",
        scope_type: "application",
        scope_application_id: "app-1",
        scope_resource_type: null,
        scope_resource_id: null,
        owner_principal_id: null,
        subject_principal_id: `principal-${index}`,
        subject_group_id: null,
        role_binding_status: index % 2 === 0 ? "eligible" : "active",
        role_definition_id: `role-${index}`,
        role_definition_name: `Role ${index}`,
        role_definition_status: "active",
        approval_required: true,
        permission_ids: [],
    }));
    const repository = new RecordingAccessReviewRepository(findings);
    const response = await listAccessReviewFindings({
        tenant_id: "tenant-1",
        stale_after_days: 7,
        limit: 2,
    }, {
        accessReviewRepository: repository,
        clock: {
            now: () => new Date("2026-05-28T12:00:00.000Z"),
        },
    });
    assert.equal(response.findings.length, 2);
});
