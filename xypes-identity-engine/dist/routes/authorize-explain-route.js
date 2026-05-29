import { authorizeExplain } from "../services/authorize-explain.js";
const authorizeExplainBodySchema = {
    type: "object",
    required: ["tenant_id", "principal_id", "application_id", "action", "resource_type", "resource_id"],
    additionalProperties: false,
    properties: {
        tenant_id: { type: "string", minLength: 1 },
        principal_id: { type: "string", minLength: 1 },
        application_id: { type: "string", minLength: 1 },
        action: { type: "string", minLength: 1 },
        resource_type: { type: "string", minLength: 1 },
        resource_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    },
};
const scopeTypeSchema = {
    type: "string",
    enum: ["platform", "tenant", "application", "resource"],
};
const explainSubjectSchema = {
    type: "object",
    additionalProperties: false,
    required: ["subject_type", "subject_principal_id", "subject_group_id", "membership_depth"],
    properties: {
        subject_type: { type: "string", enum: ["principal", "group"] },
        subject_principal_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        subject_group_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        membership_depth: { anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }] },
    },
};
const matchedBindingSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "role_binding_id",
        "role_definition_id",
        "permission_id",
        "scope_type",
        "scope_application_id",
        "scope_resource_type",
        "scope_resource_id",
    ],
    properties: {
        role_binding_id: { type: "string" },
        role_definition_id: { type: "string" },
        permission_id: { type: "string" },
        scope_type: scopeTypeSchema,
        scope_application_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        scope_resource_type: { anyOf: [{ type: "string" }, { type: "null" }] },
        scope_resource_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    },
};
const denySourceSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "deny_policy_id",
        "permission_id",
        "scope_type",
        "scope_application_id",
        "scope_resource_type",
        "scope_resource_id",
        "reason",
    ],
    properties: {
        deny_policy_id: { type: "string" },
        permission_id: { type: "string" },
        scope_type: scopeTypeSchema,
        scope_application_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        scope_resource_type: { anyOf: [{ type: "string" }, { type: "null" }] },
        scope_resource_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        reason: { anyOf: [{ type: "string" }, { type: "null" }] },
    },
};
const authorizeExplainResponseSchema = {
    200: {
        type: "object",
        additionalProperties: false,
        required: ["outcome", "decision_id", "reason_code", "matched_bindings", "trace"],
        properties: {
            outcome: { type: "string", enum: ["allow", "deny"] },
            decision_id: { type: "string" },
            reason_code: {
                type: "string",
                enum: [
                    "ALLOW_MATCHED_BINDING",
                    "DENY_MATCHED_POLICY",
                    "NO_MATCHING_BINDING",
                    "PRINCIPAL_SUSPENDED",
                    "TENANT_MEMBERSHIP_SUSPENDED",
                ],
            },
            matched_bindings: {
                type: "array",
                items: matchedBindingSchema,
            },
            deny_source: {
                anyOf: [denySourceSchema, { type: "null" }],
            },
            trace: {
                type: "object",
                additionalProperties: false,
                required: ["allow_matches", "deny_matches", "traversal_hits"],
                properties: {
                    allow_matches: {
                        type: "array",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            required: ["role_binding_id", "subject"],
                            properties: {
                                role_binding_id: { type: "string" },
                                subject: explainSubjectSchema,
                            },
                        },
                    },
                    deny_matches: {
                        type: "array",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            required: ["deny_policy_id", "subject"],
                            properties: {
                                deny_policy_id: { type: "string" },
                                subject: explainSubjectSchema,
                            },
                        },
                    },
                    traversal_hits: {
                        type: "array",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            required: ["group_id", "depth", "via_group_id"],
                            properties: {
                                group_id: { type: "string" },
                                depth: { type: "integer", minimum: 1 },
                                via_group_id: { anyOf: [{ type: "string" }, { type: "null" }] },
                            },
                        },
                    },
                },
            },
        },
    },
};
export const registerAuthorizeExplainRoute = async (app, dependencies) => {
    app.post("/v1/authorize/explain", {
        schema: {
            body: authorizeExplainBodySchema,
            response: authorizeExplainResponseSchema,
        },
    }, async (request, reply) => {
        const response = await authorizeExplain(request.body, dependencies);
        return reply.code(200).send({
            ...response,
            deny_source: response.deny_source ?? null,
        });
    });
};
