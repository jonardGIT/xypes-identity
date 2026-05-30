export interface PermissionState {
    permission_id: string;
    tenant_id: string;
    application_id: string;
    action: string;
    resource_type: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
}
export interface CreatePermissionRequest {
    tenant_id: string;
    application_id: string;
    action: string;
    resource_type: string;
    description: string | null;
    actor_principal_id: string | null;
    actor_subject: string;
    reason: string;
}
export interface PermissionAuditReference {
    audit_event_id: string;
}
export interface CreatePermissionResponse {
    permission: PermissionState;
    audit: PermissionAuditReference;
}
export type CreatePermissionErrorCode = "PERMISSION_DUPLICATE" | "PERMISSION_APPLICATION_NOT_FOUND";
export interface ListPermissionsRequest {
    tenant_id: string;
    limit?: number;
    application_id?: string;
    permission_ids?: string[];
    action?: string;
    resource_type?: string;
}
export interface ListPermissionsResponse {
    generated_at: string;
    permissions: PermissionState[];
}
