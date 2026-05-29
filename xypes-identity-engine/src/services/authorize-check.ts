import type {
  AuthorizationCheckRequest,
  AuthorizationCheckResponse,
} from "@xypes-identity/shared";

import type { AuthorizationCheckDependencies } from "../domain/authorization-types.js";
import type { OperationalTelemetryRecorder } from "../domain/operational-telemetry-types.js";
import type { DecisionIdGenerator } from "../domain/session-types.js";
import {
  buildAuthorizationDecisionLogBindings,
  recordAuthorizationDecisionLog,
  withAuthorizationSpan,
  type AuthorizationDecisionLogger,
  type AuthorizationTelemetry,
} from "./authorization-observability.js";
import {
  loadAuthorizationEvaluationSnapshot,
  loadTenantAuthorizationCacheVersions,
  type AuthorizationCacheAwareDependencies,
} from "./authorization-cache.js";
import {
  resolveAuthorizationDecision,
  resolveSuspendedAuthorizationDecision,
} from "./authorization-decision.js";

export interface AuthorizeCheckServiceDependencies extends AuthorizationCacheAwareDependencies {
  decisionIdGenerator: DecisionIdGenerator;
  decisionLogger?: AuthorizationDecisionLogger;
  decisionTelemetry?: AuthorizationTelemetry;
  operationalTelemetry?: OperationalTelemetryRecorder;
}

const toMatchedBinding = ({ subject: _subject, ...binding }: Awaited<ReturnType<AuthorizationCheckDependencies["authorizationRepository"]["findDirectPrincipalAllowBindings"]>>[number]) => binding;

const toDenySource = ({ subject: _subject, ...denySource }: Awaited<ReturnType<AuthorizationCheckDependencies["authorizationRepository"]["findDirectPrincipalDenyPolicies"]>>[number]) => denySource;

export const authorizeCheck = async (
  input: AuthorizationCheckRequest,
  dependencies: AuthorizeCheckServiceDependencies,
): Promise<AuthorizationCheckResponse> => {
  const startedAt = Date.now();

  return withAuthorizationSpan(
    dependencies.decisionTelemetry,
    "authorization.authorize_check",
    {
      "authorization.operation": "authorize.check",
      "authorization.tenant_id": input.tenant_id,
      "authorization.principal_id": input.principal_id,
      "authorization.application_id": input.application_id,
      "authorization.action": input.action,
      "authorization.resource_type": input.resource_type,
      "authorization.resource_id": input.resource_id,
    },
    async (span) => {
      const principalAccessState = await dependencies.authorizationRepository.findPrincipalAccessState?.(input);

      if (principalAccessState?.principal_status === "suspended") {
        const decision = resolveSuspendedAuthorizationDecision(
          "PRINCIPAL_SUSPENDED",
          dependencies.decisionIdGenerator,
        );

        span.setAttribute("authorization.principal_status", principalAccessState.principal_status);
        span.setAttribute("authorization.decision_id", decision.decision_id);
        span.setAttribute("authorization.outcome", decision.outcome);
        span.setAttribute("authorization.reason_code", decision.reason_code);
        span.setAttribute("authorization.matched_bindings_count", 0);
        span.setAttribute("authorization.decision_cache_status", "not_evaluated");

        recordAuthorizationDecisionLog(
          dependencies.decisionLogger,
          buildAuthorizationDecisionLogBindings("authorize.check", input, decision),
        );

        await dependencies.operationalTelemetry?.recordAuthorization({
          operation: "authorize.check",
          occurred_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
          decision_cache_status: "not_evaluated",
        });

        return {
          outcome: decision.outcome,
          decision_id: decision.decision_id,
          reason_code: decision.reason_code,
          matched_bindings: [],
        };
      }

      if (principalAccessState?.tenant_membership_status === "suspended") {
        const decision = resolveSuspendedAuthorizationDecision(
          "TENANT_MEMBERSHIP_SUSPENDED",
          dependencies.decisionIdGenerator,
        );

        span.setAttribute("authorization.tenant_membership_status", principalAccessState.tenant_membership_status);
        span.setAttribute("authorization.decision_id", decision.decision_id);
        span.setAttribute("authorization.outcome", decision.outcome);
        span.setAttribute("authorization.reason_code", decision.reason_code);
        span.setAttribute("authorization.matched_bindings_count", 0);
        span.setAttribute("authorization.decision_cache_status", "not_evaluated");

        recordAuthorizationDecisionLog(
          dependencies.decisionLogger,
          buildAuthorizationDecisionLogBindings("authorize.check", input, decision),
        );

        await dependencies.operationalTelemetry?.recordAuthorization({
          operation: "authorize.check",
          occurred_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
          decision_cache_status: "not_evaluated",
        });

        return {
          outcome: decision.outcome,
          decision_id: decision.decision_id,
          reason_code: decision.reason_code,
          matched_bindings: [],
        };
      }

      const cacheVersions = await loadTenantAuthorizationCacheVersions(
        input.tenant_id,
        dependencies.authorizationCache,
      );
      const { snapshot, decisionCacheStatus } = await loadAuthorizationEvaluationSnapshot(
        input,
        dependencies,
        cacheVersions,
      );
      const decision = resolveAuthorizationDecision(
        snapshot.matched_bindings,
        snapshot.deny_policies,
        dependencies.decisionIdGenerator,
      );

      span.setAttribute("authorization.decision_id", decision.decision_id);
      span.setAttribute("authorization.outcome", decision.outcome);
      span.setAttribute("authorization.reason_code", decision.reason_code);
      span.setAttribute("authorization.matched_bindings_count", decision.matched_bindings.length);
      span.setAttribute("authorization.decision_cache_status", decisionCacheStatus);

      if (cacheVersions !== null) {
        span.setAttribute("authorization.decision_cache_version", cacheVersions.decision_version);
      }

      if (decision.deny_source !== undefined) {
        span.setAttribute("authorization.deny_policy_id", decision.deny_source.deny_policy_id);
      }

      recordAuthorizationDecisionLog(
        dependencies.decisionLogger,
        buildAuthorizationDecisionLogBindings("authorize.check", input, decision),
      );

      await dependencies.operationalTelemetry?.recordAuthorization({
        operation: "authorize.check",
        occurred_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        decision_cache_status: decisionCacheStatus,
      });

      return {
        outcome: decision.outcome,
        decision_id: decision.decision_id,
        reason_code: decision.reason_code,
        matched_bindings: decision.matched_bindings.map(toMatchedBinding),
        deny_source: decision.deny_source !== undefined ? toDenySource(decision.deny_source) : undefined,
      };
    },
  );
};