export interface ApplicationState {
  application_id: string;
  tenant_id: string;
  slug: string;
  display_name: string;
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CreateApplicationRequest {
  tenant_id: string;
  slug: string;
  display_name: string;
  actor_principal_id: string | null;
  actor_subject: string;
  reason: string;
}

export interface ApplicationAuditReference {
  audit_event_id: string;
}

export interface CreateApplicationResponse {
  application: ApplicationState;
  audit: ApplicationAuditReference;
}

export type CreateApplicationErrorCode = "APPLICATION_DUPLICATE_TENANT_SLUG";