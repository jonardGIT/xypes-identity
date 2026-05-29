import type { AuthorizationCheckRequest, AuthorizationExplainResponse } from "@xypes-identity/shared";
import type { DecisionIdGenerator } from "../domain/session-types.js";
import { type AuthorizationDecisionLogger, type AuthorizationTelemetry } from "./authorization-observability.js";
import { type AuthorizationCacheAwareDependencies } from "./authorization-cache.js";
export interface AuthorizeExplainServiceDependencies extends AuthorizationCacheAwareDependencies {
    decisionIdGenerator: DecisionIdGenerator;
    decisionLogger?: AuthorizationDecisionLogger;
    decisionTelemetry?: AuthorizationTelemetry;
}
export declare const authorizeExplain: (input: AuthorizationCheckRequest, dependencies: AuthorizeExplainServiceDependencies) => Promise<AuthorizationExplainResponse>;
