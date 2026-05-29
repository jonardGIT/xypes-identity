import type { AuthorizationReasonCode } from "@xypes-identity/shared";
import type { AuthorizationBindingRecord, AuthorizationDenyRecord } from "../domain/authorization-types.js";
import type { DecisionIdGenerator } from "../domain/session-types.js";
export interface AuthorizationDecision {
    outcome: "allow" | "deny";
    decision_id: string;
    reason_code: AuthorizationReasonCode;
    matched_bindings: AuthorizationBindingRecord[];
    deny_source?: AuthorizationDenyRecord;
}
export declare const resolveSuspendedAuthorizationDecision: (reasonCode: "PRINCIPAL_SUSPENDED" | "TENANT_MEMBERSHIP_SUSPENDED", decisionIdGenerator: DecisionIdGenerator) => AuthorizationDecision;
export declare const resolveAuthorizationDecision: (matchedBindings: AuthorizationBindingRecord[], denyPolicies: AuthorizationDenyRecord[], decisionIdGenerator: DecisionIdGenerator) => AuthorizationDecision;
