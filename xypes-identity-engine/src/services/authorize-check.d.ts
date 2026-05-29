import type { AuthorizationCheckRequest, AuthorizationCheckResponse } from "@xypes-identity/shared";
import type { DecisionIdGenerator } from "../domain/session-types.js";
import { type AuthorizationDecisionLogger, type AuthorizationTelemetry } from "./authorization-observability.js";
import { type AuthorizationCacheAwareDependencies } from "./authorization-cache.js";
export interface AuthorizeCheckServiceDependencies extends AuthorizationCacheAwareDependencies {
    decisionIdGenerator: DecisionIdGenerator;
    decisionLogger?: AuthorizationDecisionLogger;
    decisionTelemetry?: AuthorizationTelemetry;
}
export declare const authorizeCheck: (input: AuthorizationCheckRequest, dependencies: AuthorizeCheckServiceDependencies) => Promise<AuthorizationCheckResponse>;
