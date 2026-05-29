export type PrincipalStatus = "active" | "suspended";

export type TenantMembershipStatus = "active" | "suspended";

export interface PrincipalContext {
  principal_id: string;
  tenant_id: string;
  subject: string;
  email: string | null;
  principal_status: PrincipalStatus;
  membership_status: TenantMembershipStatus;
}

export interface ResolveSessionRequest {
  token: string;
  tenant_id: string;
}

export type ResolveSessionErrorCode =
  | "AUTH_INVALID_TOKEN"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_JWKS_UNAVAILABLE"
  | "AUTH_TOKEN_VERIFICATION_UNAVAILABLE"
  | "AUTH_PRINCIPAL_NOT_FOUND"
  | "AUTH_PRINCIPAL_SUSPENDED"
  | "AUTH_TENANT_MEMBERSHIP_NOT_FOUND"
  | "AUTH_TENANT_MEMBERSHIP_SUSPENDED";

export interface ResolveSessionResponse {
  decision_id: string;
  principal: PrincipalContext;
}

export interface PrincipalResolvedAuditEvent {
  event_type: "principal.resolved";
  decision_id: string;
  principal_id: string;
  tenant_id: string;
  subject: string;
  occurred_at: string;
}