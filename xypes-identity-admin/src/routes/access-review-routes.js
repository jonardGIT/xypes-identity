import { mapSdkApiError } from "../error-mapping.js";
import { buildAccessReviewWorkbench, } from "../services/build-access-review-workbench.js";
import { renderAccessReviewConsole } from "../services/render-access-review-console.js";
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
const errorResponseSchema = {
    type: "object",
    additionalProperties: false,
    required: ["error", "message", "statusCode", "code"],
    properties: {
        error: { type: "string" },
        message: { type: "string" },
        statusCode: { type: "number" },
        code: { type: "string" },
    },
};
const listAccessReviewFindingsBodySchema = {
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
        role_binding_status: {
            anyOf: [{ type: "string", enum: ["eligible", "active"] }, { type: "null" }],
        },
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
const listAccessReviewFindingsResponseSchema = {
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
    "4xx": errorResponseSchema,
    "5xx": errorResponseSchema,
};
const accessReviewWorkbenchCountSchema = {
    type: "object",
    additionalProperties: false,
    required: ["code", "total"],
    properties: {
        code: findingCodeSchema,
        total: { type: "integer", minimum: 0 },
    },
};
const accessReviewActivationCandidateSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "finding_id",
        "entity_id",
        "title",
        "detail",
        "observed_at",
        "role_definition_id",
        "role_definition_name",
        "subject_principal_id",
        "subject_group_id",
        "scope_type",
        "scope_application_id",
        "scope_resource_type",
        "scope_resource_id",
        "permission_ids",
    ],
    properties: {
        finding_id: { type: "string" },
        entity_id: { type: "string" },
        title: { type: "string" },
        detail: { type: "string" },
        observed_at: { type: "string" },
        role_definition_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        role_definition_name: { anyOf: [{ type: "string" }, { type: "null" }] },
        subject_principal_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        subject_group_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        scope_type: { anyOf: [scopeTypeSchema, { type: "null" }] },
        scope_application_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        scope_resource_type: { anyOf: [{ type: "string" }, { type: "null" }] },
        scope_resource_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        permission_ids: {
            type: "array",
            items: { type: "string" },
        },
    },
};
const accessReviewWorkbenchSectionSchema = {
    type: "object",
    additionalProperties: false,
    required: ["code", "title", "total_findings", "findings"],
    properties: {
        code: findingCodeSchema,
        title: { type: "string" },
        total_findings: { type: "integer", minimum: 0 },
        findings: {
            type: "array",
            items: accessReviewFindingSchema,
        },
    },
};
const accessReviewWorkbenchResponseSchema = {
    200: {
        type: "object",
        additionalProperties: false,
        required: [
            "generated_at",
            "stale_cutoff_at",
            "summary",
            "approval_activation_candidates",
            "sections",
        ],
        properties: {
            generated_at: { type: "string" },
            stale_cutoff_at: { type: "string" },
            summary: {
                type: "object",
                additionalProperties: false,
                required: [
                    "total_findings",
                    "high_severity_count",
                    "medium_severity_count",
                    "approval_required_findings",
                    "approval_activation_candidates",
                    "counts_by_code",
                ],
                properties: {
                    total_findings: { type: "integer", minimum: 0 },
                    high_severity_count: { type: "integer", minimum: 0 },
                    medium_severity_count: { type: "integer", minimum: 0 },
                    approval_required_findings: { type: "integer", minimum: 0 },
                    approval_activation_candidates: { type: "integer", minimum: 0 },
                    counts_by_code: {
                        type: "array",
                        items: accessReviewWorkbenchCountSchema,
                    },
                },
            },
            approval_activation_candidates: {
                type: "array",
                items: accessReviewActivationCandidateSchema,
            },
            sections: {
                type: "array",
                items: accessReviewWorkbenchSectionSchema,
            },
        },
    },
    "4xx": errorResponseSchema,
    "5xx": errorResponseSchema,
};
export const registerAccessReviewRoutes = async (app, dependencies) => {
    app.get("/admin/access-reviews/console", async (_request, reply) => reply
        .code(200)
        .type("text/html; charset=utf-8")
        .send(renderAccessReviewConsole()));
    app.post("/admin/access-reviews/workbench", {
        schema: {
            body: listAccessReviewFindingsBodySchema,
            response: accessReviewWorkbenchResponseSchema,
        },
    }, async (request, reply) => {
        try {
            const response = await dependencies.accessReviews.listFindings(request.body);
            return reply.code(200).send(buildAccessReviewWorkbench(response));
        }
        catch (error) {
            const mappedError = mapSdkApiError(error);
            if (mappedError !== null) {
                return reply.code(mappedError.statusCode).send(mappedError);
            }
            throw error;
        }
    });
    app.post("/admin/access-reviews/findings", {
        schema: {
            body: listAccessReviewFindingsBodySchema,
            response: listAccessReviewFindingsResponseSchema,
        },
    }, async (request, reply) => {
        try {
            const response = await dependencies.accessReviews.listFindings(request.body);
            return reply.code(200).send(response);
        }
        catch (error) {
            const mappedError = mapSdkApiError(error);
            if (mappedError !== null) {
                return reply.code(mappedError.statusCode).send(mappedError);
            }
            throw error;
        }
    });
};
