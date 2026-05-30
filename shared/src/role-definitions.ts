export type RoleDefinitionStatus = "draft" | "active" | "deprecated" | "retired";

export interface RoleDefinitionState {
  role_definition_id: string;
  tenant_id: string;
  application_id: string;
  name: string;
  description: string | null;
  status: RoleDefinitionStatus;
  approval_required: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CreateRoleDefinitionRequest {
  tenant_id: string;
  application_id: string;
  name: string;
  description: string | null;
  approval_required: boolean;
  actor_principal_id: string | null;
  actor_subject: string;
  reason: string;
}

export interface RoleDefinitionAuditReference {
  audit_event_id: string;
}

export interface CreateRoleDefinitionResponse {
  role_definition: RoleDefinitionState;
  audit: RoleDefinitionAuditReference;
}

export type CreateRoleDefinitionErrorCode =
  | "ROLE_DEFINITION_DUPLICATE_NAME"
  | "ROLE_DEFINITION_APPLICATION_NOT_FOUND";

export interface UpdateRoleDefinitionStatusRequest {
  tenant_id: string;
  role_definition_id: string;
  status: RoleDefinitionStatus;
  actor_principal_id: string | null;
  actor_subject: string;
  reason: string;
}

export interface UpdateRoleDefinitionStatusResponse {
  role_definition: RoleDefinitionState;
  audit: RoleDefinitionAuditReference;
}

export type UpdateRoleDefinitionStatusErrorCode = "ROLE_DEFINITION_NOT_FOUND";

export interface ListRoleDefinitionsRequest {
  tenant_id: string;
  limit?: number;
  application_id?: string;
  role_definition_ids?: string[];
  statuses?: RoleDefinitionStatus[];
  approval_required?: boolean;
}

export interface ListRoleDefinitionsResponse {
  generated_at: string;
  role_definitions: RoleDefinitionState[];
}