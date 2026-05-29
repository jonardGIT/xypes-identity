import type { AuthorizationReasonCode } from "@xypes-identity/shared";

import type {
  AuthorizationBindingRecord,
  AuthorizationDenyRecord,
} from "../domain/authorization-types.js";
import type { DecisionIdGenerator } from "../domain/session-types.js";

const scopeRank: Record<"platform" | "tenant" | "application" | "resource", number> = {
  platform: 0,
  tenant: 1,
  application: 2,
  resource: 3,
};

const compareDenySpecificity = (
  left: AuthorizationDenyRecord,
  right: AuthorizationDenyRecord,
): number => {
  const rankDifference = scopeRank[left.scope_type] - scopeRank[right.scope_type];

  if (rankDifference !== 0) {
    return rankDifference;
  }

  return left.deny_policy_id.localeCompare(right.deny_policy_id);
};

export interface AuthorizationDecision {
  outcome: "allow" | "deny";
  decision_id: string;
  reason_code: AuthorizationReasonCode;
  matched_bindings: AuthorizationBindingRecord[];
  deny_source?: AuthorizationDenyRecord;
}

export const resolveSuspendedAuthorizationDecision = (
  reasonCode: "PRINCIPAL_SUSPENDED" | "TENANT_MEMBERSHIP_SUSPENDED",
  decisionIdGenerator: DecisionIdGenerator,
): AuthorizationDecision => ({
  outcome: "deny",
  decision_id: decisionIdGenerator.nextId(),
  reason_code: reasonCode,
  matched_bindings: [],
});

export const resolveAuthorizationDecision = (
  matchedBindings: AuthorizationBindingRecord[],
  denyPolicies: AuthorizationDenyRecord[],
  decisionIdGenerator: DecisionIdGenerator,
): AuthorizationDecision => {
  const denySource = [...denyPolicies].sort(compareDenySpecificity)[0];

  if (denySource !== undefined) {
    return {
      outcome: "deny",
      decision_id: decisionIdGenerator.nextId(),
      reason_code: "DENY_MATCHED_POLICY",
      matched_bindings: matchedBindings,
      deny_source: denySource,
    };
  }

  if (matchedBindings.length > 0) {
    return {
      outcome: "allow",
      decision_id: decisionIdGenerator.nextId(),
      reason_code: "ALLOW_MATCHED_BINDING",
      matched_bindings: matchedBindings,
    };
  }

  return {
    outcome: "deny",
    decision_id: decisionIdGenerator.nextId(),
    reason_code: "NO_MATCHING_BINDING",
    matched_bindings: [],
  };
};