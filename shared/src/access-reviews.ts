import type { AuthorizationScopeType } from "./authorize.js";
import type { RoleBindingStatus } from "./role-bindings.js";
import type { RoleDefinitionStatus } from "./role-definitions.js";

export type AccessReviewFindingCode =
  | "ORPHANED_GROUP_OWNER"
  | "PRIVILEGED_ROLE_BINDING"
  | "STALE_GROUP"
  | "STALE_ROLE_BINDING";

export type AccessReviewFindingSeverity = "medium" | "high";

export type AccessReviewEntityType = "group" | "role_binding";

export interface ListAccessReviewFindingsRequest {
  tenant_id: string;
  stale_after_days: number;
  finding_codes?: AccessReviewFindingCode[];
  limit?: number;
}

export interface AccessReviewFinding {
  finding_id: string;
  code: AccessReviewFindingCode;
  severity: AccessReviewFindingSeverity;
  entity_type: AccessReviewEntityType;
  entity_id: string;
  title: string;
  detail: string;
  evidence_ids: string[];
  observed_at: string;
  scope_type: AuthorizationScopeType | null;
  scope_application_id: string | null;
  scope_resource_type: string | null;
  scope_resource_id: string | null;
  owner_principal_id: string | null;
  subject_principal_id: string | null;
  subject_group_id: string | null;
  role_binding_status: RoleBindingStatus | null;
  role_definition_id: string | null;
  role_definition_name: string | null;
  role_definition_status: RoleDefinitionStatus | null;
  approval_required: boolean | null;
  permission_ids: string[];
}

export interface ListAccessReviewFindingsResponse {
  generated_at: string;
  stale_cutoff_at: string;
  findings: AccessReviewFinding[];
}