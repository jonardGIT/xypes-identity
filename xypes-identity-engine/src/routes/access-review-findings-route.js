import { listAccessReviewFindings } from "../services/list-access-review-findings.js";
const findingCodeSchema = {
    type: "string",
    enum: [
        "ORPHANED_GROUP_OWNER",
        "PRIVILEGED_ROLE_BINDING",
        "STALE_GROUP",
        "STALE_ROLE_BINDING",
    ],
};
const scopeTypeSchema = {
    type: "string",
    enum: ["platform", "tenant", "application", "resource"],
};
const roleDefinitionStatusSchema = {
    type: "string",
    enum: ["draft", "active", "deprecated", "retired"],
};
const accessReviewFindingsBodySchema = {
    type: "object",
    required: ["tenant_id", "stale_after_days"],
    additionalProperties: false,
    properties: {
        tenant_id: { type: "string", minLength: 1 },
        stale_after_days: { type: "integer", minimum: 1 },
        limit: { type: "integer", minimum: 1, maximum: 500 },
        finding_codes: {
            type: "array",
            items: findingCodeSchema,
            uniqueItems: true,
            minItems: 1,
        },
    },
};
const accessReviewFindingSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "finding_id",
        "code",
        "severity",
        "entity_type",
        "entity_id",
        "title",
        "detail",
        "evidence_ids",
        "observed_at",
        "scope_type",
        "scope_application_id",
        "scope_resource_type",
        "scope_resource_id",
        "owner_principal_id",
        "subject_principal_id",
        "subject_group_id",
        "role_binding_status",
        "role_definition_id",
        "role_definition_name",
        "role_definition_status",
        "approval_required",
        "permission_ids",
    ],
    properties: {
        finding_id: { type: "string" },
        code: findingCodeSchema,
        severity: { type: "string", enum: ["medium", "high"] },
        entity_type: { type: "string", enum: ["group", "role_binding"] },
        entity_id: { type: "string" },
        title: { type: "string" },
        detail: { type: "string" },
        evidence_ids: {
            type: "array",
            items: { type: "string" },
        },
        observed_at: { type: "string" },
        scope_type: { anyOf: [scopeTypeSchema, { type: "null" }] },
        scope_application_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        scope_resource_type: { anyOf: [{ type: "string" }, { type: "null" }] },
        scope_resource_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        owner_principal_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        subject_principal_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        subject_group_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        role_binding_status: { anyOf: [{ type: "string", enum: ["eligible", "active"] }, { type: "null" }] },
        role_definition_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        role_definition_name: { anyOf: [{ type: "string" }, { type: "null" }] },
        role_definition_status: { anyOf: [roleDefinitionStatusSchema, { type: "null" }] },
        approval_required: { anyOf: [{ type: "boolean" }, { type: "null" }] },
        permission_ids: {
            type: "array",
            items: { type: "string" },
        },
    },
};
const accessReviewFindingsResponseSchema = {
    200: {
        type: "object",
        additionalProperties: false,
        required: ["generated_at", "stale_cutoff_at", "findings"],
        properties: {
            generated_at: { type: "string" },
            stale_cutoff_at: { type: "string" },
            findings: {
                type: "array",
                items: accessReviewFindingSchema,
            },
        },
    },
};
export const registerAccessReviewFindingsRoute = async (app, dependencies) => {
    app.post("/v1/access-reviews/findings", {
        schema: {
            body: accessReviewFindingsBodySchema,
            response: accessReviewFindingsResponseSchema,
        },
    }, async (request, reply) => {
        const response = await listAccessReviewFindings(request.body, dependencies);
        return reply.code(200).send(response);
    });
};
