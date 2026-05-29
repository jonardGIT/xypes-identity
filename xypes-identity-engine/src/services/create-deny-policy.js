import { CreateDenyPolicyError } from "../domain/deny-policy-errors.js";
const assertValidSubject = (input) => {
    const hasPrincipalSubject = input.subject_principal_id !== null;
    const hasGroupSubject = input.subject_group_id !== null;
    if (hasPrincipalSubject === hasGroupSubject) {
        throw new CreateDenyPolicyError("DENY_POLICY_SUBJECT_INVALID", "Exactly one subject must be supplied via subject_principal_id or subject_group_id.", 400);
    }
};
const assertValidScope = (input) => {
    const hasApplicationId = input.scope_application_id !== null;
    const hasResourceType = input.scope_resource_type !== null;
    const hasResourceId = input.scope_resource_id !== null;
    switch (input.scope_type) {
        case "platform":
        case "tenant":
            if (hasApplicationId || hasResourceType || hasResourceId) {
                throw new CreateDenyPolicyError("DENY_POLICY_SCOPE_INVALID", "Platform and tenant deny policies cannot include application or resource scope fields.", 400);
            }
            return;
        case "application":
            if (!hasApplicationId || hasResourceType || hasResourceId) {
                throw new CreateDenyPolicyError("DENY_POLICY_SCOPE_INVALID", "Application deny policies require scope_application_id and cannot include resource scope fields.", 400);
            }
            return;
        case "resource":
            if (!hasApplicationId || !hasResourceType || !hasResourceId) {
                throw new CreateDenyPolicyError("DENY_POLICY_SCOPE_INVALID", "Resource deny policies require scope_application_id, scope_resource_type, and scope_resource_id.", 400);
            }
            return;
    }
};
const getReference = (input) => {
    if (input.scope_type === "application" || input.scope_type === "resource") {
        return {
            reference_type: "application",
            reference_id: input.scope_application_id,
        };
    }
    return {
        reference_type: "tenant",
        reference_id: input.tenant_id,
    };
};
export const createDenyPolicy = async (input, dependencies) => {
    assertValidSubject(input);
    assertValidScope(input);
    const occurredAt = dependencies.clock.now().toISOString();
    const denyPolicyId = dependencies.idGenerator.nextId();
    const auditEventId = dependencies.idGenerator.nextId();
    const outboxEventId = dependencies.idGenerator.nextId();
    const denyPolicy = {
        deny_policy_id: denyPolicyId,
        tenant_id: input.tenant_id,
        permission_id: input.permission_id,
        subject_principal_id: input.subject_principal_id,
        subject_group_id: input.subject_group_id,
        scope_type: input.scope_type,
        scope_application_id: input.scope_application_id,
        scope_resource_type: input.scope_resource_type,
        scope_resource_id: input.scope_resource_id,
        reason: input.reason,
        created_at: occurredAt,
        updated_at: occurredAt,
        created_by: input.actor_subject,
        updated_by: input.actor_subject,
    };
    const reference = getReference(input);
    await dependencies.denyPolicyRepository.createDenyPolicy({
        deny_policy: denyPolicy,
        audit_event_id: auditEventId,
        outbox_event_id: outboxEventId,
        actor_principal_id: input.actor_principal_id,
        actor_subject: input.actor_subject,
        audit_reason: input.audit_reason,
        correlation_id: denyPolicyId,
        reference_type: reference.reference_type,
        reference_id: reference.reference_id,
        occurred_at: occurredAt,
    });
    return {
        deny_policy: denyPolicy,
        audit: {
            audit_event_id: auditEventId,
        },
    };
};
