const sectionOrder = [
    "PRIVILEGED_ROLE_BINDING",
    "STALE_ROLE_BINDING",
    "STALE_GROUP",
    "ORPHANED_GROUP_OWNER",
];
const sectionTitles = {
    PRIVILEGED_ROLE_BINDING: "Approval Queue",
    STALE_ROLE_BINDING: "Stale Role Bindings",
    STALE_GROUP: "Stale Groups",
    ORPHANED_GROUP_OWNER: "Orphaned Group Owners",
};
const toActivationCandidate = (finding) => ({
    finding_id: finding.finding_id,
    entity_id: finding.entity_id,
    title: finding.title,
    detail: finding.detail,
    observed_at: finding.observed_at,
    role_definition_id: finding.role_definition_id,
    role_definition_name: finding.role_definition_name,
    subject_principal_id: finding.subject_principal_id,
    subject_group_id: finding.subject_group_id,
    scope_type: finding.scope_type,
    scope_application_id: finding.scope_application_id,
    scope_resource_type: finding.scope_resource_type,
    scope_resource_id: finding.scope_resource_id,
    permission_ids: finding.permission_ids,
});
export const buildAccessReviewWorkbench = (response) => {
    const findingsByCode = new Map(sectionOrder.map((code) => [code, []]));
    for (const finding of response.findings) {
        findingsByCode.get(finding.code)?.push(finding);
    }
    const approvalActivationCandidates = response.findings
        .filter((finding) => finding.approval_required === true && finding.role_binding_status === "eligible")
        .map(toActivationCandidate);
    return {
        generated_at: response.generated_at,
        stale_cutoff_at: response.stale_cutoff_at,
        summary: {
            total_findings: response.findings.length,
            high_severity_count: response.findings.filter((finding) => finding.severity === "high").length,
            medium_severity_count: response.findings.filter((finding) => finding.severity === "medium").length,
            approval_required_findings: response.findings.filter((finding) => finding.approval_required === true).length,
            approval_activation_candidates: approvalActivationCandidates.length,
            counts_by_code: sectionOrder.map((code) => ({
                code,
                total: findingsByCode.get(code)?.length ?? 0,
            })),
        },
        approval_activation_candidates: approvalActivationCandidates,
        sections: sectionOrder.map((code) => ({
            code,
            title: sectionTitles[code],
            total_findings: findingsByCode.get(code)?.length ?? 0,
            findings: findingsByCode.get(code) ?? [],
        })),
    };
};
