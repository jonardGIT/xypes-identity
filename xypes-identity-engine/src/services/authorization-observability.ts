import type {
  AuthorizationCheckRequest,
  AuthorizationReasonCode,
} from "@xypes-identity/shared";

type AuthorizationSpanAttributeValue = string | number | boolean | null | undefined;

export interface AuthorizationDecisionLogBindings {
  event_name: "authorization.decision";
  operation: "authorize.check" | "authorize.explain";
  tenant_id: string;
  principal_id: string;
  application_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  decision_id: string;
  outcome: "allow" | "deny";
  reason_code: AuthorizationReasonCode;
  matched_bindings_count: number;
  deny_policy_id: string | null;
}

export interface AuthorizationDecisionLogger {
  info(bindings: AuthorizationDecisionLogBindings, message: string): void;
}

export interface AuthorizationSpan {
  setAttribute(name: string, value: string | number | boolean): void;
  recordException(error: unknown): void;
}

export interface AuthorizationTelemetry {
  runInSpan<T>(
    spanName: string,
    attributes: Record<string, AuthorizationSpanAttributeValue>,
    callback: (span: AuthorizationSpan) => Promise<T>,
  ): Promise<T>;
}

interface AuthorizationDecisionSummary {
  decision_id: string;
  outcome: "allow" | "deny";
  reason_code: AuthorizationReasonCode;
  matched_bindings: Array<{ role_binding_id: string }>;
  deny_source?: { deny_policy_id: string };
}

const noopSpan: AuthorizationSpan = {
  setAttribute: () => {},
  recordException: () => {},
};

export const noOpAuthorizationTelemetry: AuthorizationTelemetry = {
  runInSpan: async (_spanName, _attributes, callback) => callback(noopSpan),
};

const pruneSpanAttributes = (
  attributes: Record<string, AuthorizationSpanAttributeValue>,
): Record<string, string | number | boolean> => {
  const entries = Object.entries(attributes)
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== null);

  return Object.fromEntries(entries);
};

export const withAuthorizationSpan = async <T>(
  telemetry: AuthorizationTelemetry | undefined,
  spanName: string,
  attributes: Record<string, AuthorizationSpanAttributeValue>,
  callback: (span: AuthorizationSpan) => Promise<T>,
): Promise<T> => {
  const resolvedTelemetry = telemetry ?? noOpAuthorizationTelemetry;

  return resolvedTelemetry.runInSpan(spanName, pruneSpanAttributes(attributes), callback);
};

export const buildAuthorizationDecisionLogBindings = (
  operation: "authorize.check" | "authorize.explain",
  input: AuthorizationCheckRequest,
  decision: AuthorizationDecisionSummary,
): AuthorizationDecisionLogBindings => ({
  event_name: "authorization.decision",
  operation,
  tenant_id: input.tenant_id,
  principal_id: input.principal_id,
  application_id: input.application_id,
  action: input.action,
  resource_type: input.resource_type,
  resource_id: input.resource_id,
  decision_id: decision.decision_id,
  outcome: decision.outcome,
  reason_code: decision.reason_code,
  matched_bindings_count: decision.matched_bindings.length,
  deny_policy_id: decision.deny_source?.deny_policy_id ?? null,
});

export const recordAuthorizationDecisionLog = (
  logger: AuthorizationDecisionLogger | undefined,
  bindings: AuthorizationDecisionLogBindings,
): void => {
  logger?.info(bindings, "Authorization decision resolved.");
};