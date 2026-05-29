import type { AuthorizationScopeType } from "./authorize.js";

export type RoleBindingStatus = "eligible" | "active";

export interface RoleBindingState {
  role_binding_id: string;
  tenant_id: string;
  role_definition_id: string;
  role_binding_status: RoleBindingStatus;
  subject_principal_id: string | null;
  subject_group_id: string | null;
  scope_type: AuthorizationScopeType;
  scope_application_id: string | null;
  scope_resource_type: string | null;
  scope_resource_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CreateRoleBindingRequest {
  tenant_id: string;
  role_definition_id: string;
  subject_principal_id: string | null;
  subject_group_id: string | null;
  scope_type: AuthorizationScopeType;
  scope_application_id: string | null;
  scope_resource_type: string | null;
  scope_resource_id: string | null;
  actor_principal_id: string | null;
  actor_subject: string;
  reason: string;
}

export interface RoleBindingAuditReference {
  audit_event_id: string;
}

export interface CreateRoleBindingResponse {
  role_binding: RoleBindingState;
  audit: RoleBindingAuditReference;
}

export type CreateRoleBindingErrorCode =
  | "ROLE_BINDING_SUBJECT_INVALID"
  | "ROLE_BINDING_SCOPE_INVALID"
  | "ROLE_BINDING_ROLE_DEFINITION_NOT_FOUND"
  | "ROLE_BINDING_PRINCIPAL_NOT_FOUND"
  | "ROLE_BINDING_GROUP_NOT_FOUND"
  | "ROLE_BINDING_SCOPE_APPLICATION_NOT_FOUND"
  | "ROLE_BINDING_SOD_CONFLICT";

export interface UpdateRoleBindingStatusRequest {
  tenant_id: string;
  role_binding_id: string;
  role_binding_status: RoleBindingStatus;
  actor_principal_id: string | null;
  actor_subject: string;
  reason: string;
}

export interface UpdateRoleBindingStatusResponse {
  role_binding: RoleBindingState;
  audit: RoleBindingAuditReference;
}

export type UpdateRoleBindingStatusErrorCode = "ROLE_BINDING_NOT_FOUND";