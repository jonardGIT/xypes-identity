import { ResolveSessionError } from "../domain/auth-errors.js";
export const resolveSession = async (input, dependencies) => {
    const verifiedToken = await dependencies.tokenVerifier.verify(input.token);
    const principal = await dependencies.principalRepository.findBySubject(verifiedToken.subject);
    if (principal === null) {
        throw new ResolveSessionError("AUTH_PRINCIPAL_NOT_FOUND", "No principal is registered for the supplied subject.", 404);
    }
    if (principal.status !== "active") {
        throw new ResolveSessionError("AUTH_PRINCIPAL_SUSPENDED", "The principal is suspended.", 403);
    }
    const membership = await dependencies.principalRepository.findTenantMembership({
        principalId: principal.principal_id,
        tenantId: input.tenant_id,
    });
    if (membership === null) {
        throw new ResolveSessionError("AUTH_TENANT_MEMBERSHIP_NOT_FOUND", "The principal is not a member of the requested tenant.", 403);
    }
    if (membership.status !== "active") {
        throw new ResolveSessionError("AUTH_TENANT_MEMBERSHIP_SUSPENDED", "The principal's membership in the requested tenant is suspended.", 403);
    }
    const decisionId = dependencies.decisionIdGenerator.nextId();
    const occurredAt = dependencies.clock.now().toISOString();
    const principalContext = {
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
    return {
        decision_id: decisionId,
        principal: principalContext,
    };
};
