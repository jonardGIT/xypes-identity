import type { AuthorizationCheckRequest, AuthorizationReasonCode } from "@xypes-identity/shared";
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
    runInSpan<T>(spanName: string, attributes: Record<string, AuthorizationSpanAttributeValue>, callback: (span: AuthorizationSpan) => Promise<T>): Promise<T>;
}
interface AuthorizationDecisionSummary {
    decision_id: string;
    outcome: "allow" | "deny";
    reason_code: AuthorizationReasonCode;
    matched_bindings: Array<{
        role_binding_id: string;
    }>;
    deny_source?: {
        deny_policy_id: string;
    };
}
export declare const noOpAuthorizationTelemetry: AuthorizationTelemetry;
export declare const withAuthorizationSpan: <T>(telemetry: AuthorizationTelemetry | undefined, spanName: string, attributes: Record<string, AuthorizationSpanAttributeValue>, callback: (span: AuthorizationSpan) => Promise<T>) => Promise<T>;
export declare const buildAuthorizationDecisionLogBindings: (operation: "authorize.check" | "authorize.explain", input: AuthorizationCheckRequest, decision: AuthorizationDecisionSummary) => AuthorizationDecisionLogBindings;
export declare const recordAuthorizationDecisionLog: (logger: AuthorizationDecisionLogger | undefined, bindings: AuthorizationDecisionLogBindings) => void;
export {};
