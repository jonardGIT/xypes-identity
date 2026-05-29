export interface RolePermissionState {
  role_permission_id: string;
  tenant_id: string;
  role_definition_id: string;
  permission_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface AttachRolePermissionRequest {
  tenant_id: string;
  role_definition_id: string;
  permission_id: string;
  actor_principal_id: string | null;
  actor_subject: string;
  reason: string;
}

export interface RolePermissionAuditReference {
  audit_event_id: string;
}

export interface AttachRolePermissionResponse {
  role_permission: RolePermissionState;
  audit: RolePermissionAuditReference;
}

export type AttachRolePermissionErrorCode =
  | "ROLE_PERMISSION_ROLE_DEFINITION_NOT_FOUND"
  | "ROLE_PERMISSION_PERMISSION_NOT_FOUND"
  | "ROLE_PERMISSION_DUPLICATE";