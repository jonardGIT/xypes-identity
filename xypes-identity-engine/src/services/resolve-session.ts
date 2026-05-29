import type {
  PrincipalContext,
  ResolveSessionRequest,
  ResolveSessionResponse,
} from "@xypes-identity/shared";

import { ResolveSessionError } from "../domain/auth-errors.js";
import type { ResolveSessionDependencies } from "../domain/session-types.js";

export const resolveSession = async (
  input: ResolveSessionRequest,
  dependencies: ResolveSessionDependencies,
): Promise<ResolveSessionResponse> => {
  const startedAt = dependencies.clock.now();
  let subject: string | null = null;
  let principalId: string | null = null;

  try {
    const verifiedToken = await dependencies.tokenVerifier.verify(input.token);
    subject = verifiedToken.subject;

    const principal = await dependencies.principalRepository.findBySubject(verifiedToken.subject);

    if (principal === null) {
      throw new ResolveSessionError(
        "AUTH_PRINCIPAL_NOT_FOUND",
        "No principal is registered for the supplied subject.",
        404,
      );
    }

    principalId = principal.principal_id;

    if (principal.status !== "active") {
      throw new ResolveSessionError(
        "AUTH_PRINCIPAL_SUSPENDED",
        "The principal is suspended.",
        403,
      );
    }

    const membership = await dependencies.principalRepository.findTenantMembership({
      principalId: principal.principal_id,
      tenantId: input.tenant_id,
    });

    if (membership === null) {
      throw new ResolveSessionError(
        "AUTH_TENANT_MEMBERSHIP_NOT_FOUND",
        "The principal is not a member of the requested tenant.",
        403,
      );
    }

    if (membership.status !== "active") {
      throw new ResolveSessionError(
        "AUTH_TENANT_MEMBERSHIP_SUSPENDED",
        "The principal's membership in the requested tenant is suspended.",
        403,
      );
    }

    const decisionId = dependencies.decisionIdGenerator.nextId();
    const occurredAt = dependencies.clock.now().toISOString();
    const principalContext: PrincipalContext = {
      principal_id: principal.principal_id,
      tenant_id: membership.tenant_id,
      subject: principal.subject,
      email: principal.email,
      principal_status: principal.status,
      membership_status: membership.status,
    };

    await dependencies.auditPublisher.publish({
      event_type: "principal.resolved",
      decision_id: decisionId,
      principal_id: principal.principal_id,
      tenant_id: membership.tenant_id,
      subject: principal.subject,
      occurred_at: occurredAt,
    });

    dependencies.sessionLogger?.info(
      {
        event_name: "resolve_session.result",
        tenant_id: membership.tenant_id,
        subject,
        principal_id: principal.principal_id,
        decision_id: decisionId,
        outcome: "resolved",
        error_code: null,
        status_code: null,
      },
      "Resolve session completed.",
    );

    await dependencies.operationalTelemetry?.recordResolveSession({
      outcome: "success",
      duration_ms: dependencies.clock.now().getTime() - startedAt.getTime(),
      occurred_at: occurredAt,
    });

    return {
      decision_id: decisionId,
      principal: principalContext,
    };
  } catch (error) {
    if (error instanceof ResolveSessionError) {
      dependencies.sessionLogger?.warn(
        {
          event_name: "resolve_session.result",
          tenant_id: input.tenant_id,
          subject,
          principal_id: principalId,
          decision_id: null,
          outcome: "error",
          error_code: error.code,
          status_code: error.statusCode,
        },
        "Resolve session failed.",
      );

      await dependencies.operationalTelemetry?.recordResolveSession({
        outcome: "failure",
        duration_ms: dependencies.clock.now().getTime() - startedAt.getTime(),
        occurred_at: dependencies.clock.now().toISOString(),
        error_code: error.code,
      });
    }

    throw error;
  }
};