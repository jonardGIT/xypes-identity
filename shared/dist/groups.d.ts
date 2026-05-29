import type { AuthorizationScopeType } from "./authorize.js";
export type GroupType = "manual" | "synced" | "rule_based";
export interface GroupState {
    group_id: string;
    tenant_id: string;
    scope_application_id: string | null;
    name: string;
    description: string | null;
    group_type: GroupType;
    owner_principal_id: string | null;
    scope_type: AuthorizationScopeType;
    scope_resource_type: string | null;
    scope_resource_id: string | null;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
}
export interface CreateGroupRequest {
    tenant_id: string;
    scope_application_id: string | null;
    name: string;
    description: string | null;
    group_type: GroupType;
    owner_principal_id: string;
    scope_type: AuthorizationScopeType;
    scope_resource_type: string | null;
    scope_resource_id: string | null;
    actor_principal_id: string | null;
    actor_subject: string;
    reason: string;
}
export interface GroupAuditReference {
    audit_event_id: string;
}
export interface CreateGroupResponse {
    group: GroupState;
    audit: GroupAuditReference;
}
export type CreateGroupErrorCode = "GROUP_DUPLICATE_NAME" | "GROUP_OWNER_PRINCIPAL_NOT_FOUND" | "GROUP_SCOPE_INVALID" | "GROUP_SCOPE_APPLICATION_NOT_FOUND";
