import type { AccessReviewFinding, AccessReviewFindingCode, ListAccessReviewFindingsResponse } from "@xypes-identity/sdk";
export interface AdminAccessReviewWorkbenchCount {
    code: AccessReviewFindingCode;
    total: number;
}
export interface AdminAccessReviewActivationCandidate {
    finding_id: string;
    entity_id: string;
    title: string;
    detail: string;
    observed_at: string;
    role_definition_id: string | null;
    role_definition_name: string | null;
    subject_principal_id: string | null;
    subject_group_id: string | null;
    scope_type: AccessReviewFinding["scope_type"];
    scope_application_id: string | null;
    scope_resource_type: string | null;
    scope_resource_id: string | null;
    permission_ids: string[];
}
export interface AdminAccessReviewWorkbenchSection {
    code: AccessReviewFindingCode;
    title: string;
    total_findings: number;
    findings: AccessReviewFinding[];
}
export interface AdminAccessReviewWorkbenchResponse {
    generated_at: string;
    stale_cutoff_at: string;
    summary: {
        total_findings: number;
        high_severity_count: number;
        medium_severity_count: number;
        approval_required_findings: number;
        approval_activation_candidates: number;
        counts_by_code: AdminAccessReviewWorkbenchCount[];
    };
    approval_activation_candidates: AdminAccessReviewActivationCandidate[];
    sections: AdminAccessReviewWorkbenchSection[];
}
export declare const buildAccessReviewWorkbench: (response: ListAccessReviewFindingsResponse) => AdminAccessReviewWorkbenchResponse;
