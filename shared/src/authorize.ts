export type AuthorizationScopeType = "platform" | "tenant" | "application" | "resource";

export interface AuthorizationCheckRequest {
  tenant_id: string;
  principal_id: string;
  application_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
}

export interface AuthorizationExplainRequest extends AuthorizationCheckRequest {}

export interface AuthorizationMatchedBinding {
  role_binding_id: string;
  role_definition_id: string;
  permission_id: string;
  scope_type: AuthorizationScopeType;
  scope_application_id: string | null;
  scope_resource_type: string | null;
  scope_resource_id: string | null;
}

export interface AuthorizationDenySource {
  deny_policy_id: string;
  permission_id: string;
  scope_type: AuthorizationScopeType;
  scope_application_id: string | null;
  scope_resource_type: string | null;
  scope_resource_id: string | null;
  reason: string | null;
}

export type AuthorizationOutcome = "allow" | "deny";

export type AuthorizationReasonCode =
  | "ALLOW_MATCHED_BINDING"
  | "DENY_MATCHED_POLICY"
  | "NO_MATCHING_BINDING"
  | "PRINCIPAL_SUSPENDED"
  | "TENANT_MEMBERSHIP_SUSPENDED";

export interface AuthorizationCheckResponse {
  outcome: AuthorizationOutcome;
  decision_id: string;
  reason_code: AuthorizationReasonCode;
  matched_bindings: AuthorizationMatchedBinding[];
  deny_source?: AuthorizationDenySource;
}

export type AuthorizationExplainSubjectType = "principal" | "group";

export interface AuthorizationExplainSubjectMatch {
  subject_type: AuthorizationExplainSubjectType;
  subject_principal_id: string | null;
  subject_group_id: string | null;
  membership_depth: number | null;
}

export interface AuthorizationExplainAllowMatch {
  role_binding_id: string;
  subject: AuthorizationExplainSubjectMatch;
}

export interface AuthorizationExplainDenyMatch {
  deny_policy_id: string;
  subject: AuthorizationExplainSubjectMatch;
}

export interface AuthorizationExplainTraversalHit {
  group_id: string;
  depth: number;
  via_group_id: string | null;
}

export interface AuthorizationExplainTrace {
  allow_matches: AuthorizationExplainAllowMatch[];
  deny_matches: AuthorizationExplainDenyMatch[];
  traversal_hits: AuthorizationExplainTraversalHit[];
}

export interface AuthorizationExplainResponse extends AuthorizationCheckResponse {
  trace: AuthorizationExplainTrace;
}