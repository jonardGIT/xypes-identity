import type { AuthorizationCheckRequest, AuthorizationDenySource, AuthorizationExplainSubjectMatch, AuthorizationExplainTraversalHit, AuthorizationMatchedBinding } from "@xypes-identity/shared";
export interface AuthorizationRecordSubjectMatch extends AuthorizationExplainSubjectMatch {
}
export interface AuthorizationBindingRecord extends AuthorizationMatchedBinding {
    subject: AuthorizationRecordSubjectMatch;
}
export interface AuthorizationDenyRecord extends AuthorizationDenySource {
    subject: AuthorizationRecordSubjectMatch;
}
export interface AuthorizationTraversalHitRecord extends AuthorizationExplainTraversalHit {
}
export interface AuthorizationPrincipalAccessState {
    principal_status: "active" | "suspended" | null;
    tenant_membership_status: "active" | "suspended" | null;
}
export interface AuthorizationRepository {
    findPrincipalAccessState?(input: AuthorizationCheckRequest): Promise<AuthorizationPrincipalAccessState | null>;
    findDirectPrincipalAllowBindings(input: AuthorizationCheckRequest): Promise<AuthorizationBindingRecord[]>;
    findDirectPrincipalDenyPolicies(input: AuthorizationCheckRequest): Promise<AuthorizationDenyRecord[]>;
    findPrincipalGroupTraversalHits(input: AuthorizationCheckRequest): Promise<AuthorizationTraversalHitRecord[]>;
}
export interface AuthorizationCheckDependencies {
    authorizationRepository: AuthorizationRepository;
}
