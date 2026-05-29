import type { AuthorizationScopeType } from "./authorize.js";

export interface DenyPolicyState {
  deny_policy_id: string;
  tenant_id: string;
  permission_id: string;
  subject_principal_id: string | null;
  subject_group_id: string | null;
  scope_type: AuthorizationScopeType;
  scope_application_id: string | null;
  scope_resource_type: string | null;
  scope_resource_id: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CreateDenyPolicyRequest {
  tenant_id: string;
  permission_id: string;
  subject_principal_id: string | null;
  subject_group_id: string | null;
  scope_type: AuthorizationScopeType;
  scope_application_id: string | null;
  scope_resource_type: string | null;
  scope_resource_id: string | null;
  reason: string | null;
  actor_principal_id: string | null;
  actor_subject: string;
  audit_reason: string;
}

export interface DenyPolicyAuditReference {
  audit_event_id: string;
}

export interface CreateDenyPolicyResponse {
  deny_policy: DenyPolicyState;
  audit: DenyPolicyAuditReference;
}

export type CreateDenyPolicyErrorCode =
  | "DENY_POLICY_SUBJECT_INVALID"
  | "DENY_POLICY_SCOPE_INVALID"
  | "DENY_POLICY_PERMISSION_NOT_FOUND"
  | "DENY_POLICY_PRINCIPAL_NOT_FOUND"
  | "DENY_POLICY_GROUP_NOT_FOUND"
  | "DENY_POLICY_SCOPE_APPLICATION_NOT_FOUND";