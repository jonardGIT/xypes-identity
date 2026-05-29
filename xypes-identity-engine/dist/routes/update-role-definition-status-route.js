import { UpdateRoleDefinitionStatusError } from "../domain/role-definition-errors.js";
import { updateRoleDefinitionStatus } from "../services/update-role-definition-status.js";
const updateRoleDefinitionStatusParamsSchema = {
    type: "object",
    required: ["role_definition_id"],
    additionalProperties: false,
    properties: {
        role_definition_id: { type: "string", minLength: 1 },
    },
};
const updateRoleDefinitionStatusBodySchema = {
    type: "object",
    required: ["tenant_id", "status", "actor_principal_id", "actor_subject", "reason"],
    additionalProperties: false,
    properties: {
        tenant_id: { type: "string", minLength: 1 },
        status: { type: "string", enum: ["draft", "active", "deprecated", "retired"] },
        actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
        actor_subject: { type: "string", minLength: 1 },
        reason: { type: "string", minLength: 1 },
    },
};
const roleDefinitionSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "role_definition_id",
        "tenant_id",
        "application_id",
        "name",
        "description",
        "status",
        "approval_required",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    ],
    properties: {
        role_definition_id: { type: "string" },
        tenant_id: { type: "string" },
        application_id: { type: "string" },
        name: { type: "string" },
        description: { anyOf: [{ type: "string" }, { type: "null" }] },
        status: { type: "string", enum: ["draft", "active", "deprecated", "retired"] },
        approval_required: { type: "boolean" },
        created_at: { type: "string" },
        updated_at: { type: "string" },
        created_by: { type: "string" },
        updated_by: { type: "string" },
    },
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
const updateRoleDefinitionStatusResponseSchema = {
    200: {
        type: "object",
        additionalProperties: false,
        required: ["role_definition", "audit"],
        properties: {
            role_definition: roleDefinitionSchema,
            audit: {
                type: "object",
                additionalProperties: false,
                required: ["audit_event_id"],
                properties: {
                    audit_event_id: { type: "string" },
                },
            },
        },
    },
    404: errorResponseSchema,
};
export const registerUpdateRoleDefinitionStatusRoute = async (app, dependencies) => {
    app.patch("/v1/role-definitions/:role_definition_id/status", {
        schema: {
            params: updateRoleDefinitionStatusParamsSchema,
            body: updateRoleDefinitionStatusBodySchema,
            response: updateRoleDefinitionStatusResponseSchema,
        },
    }, async (request, reply) => {
        try {
            const params = request.params;
            const body = request.body;
            const response = await updateRoleDefinitionStatus({
                ...body,
                role_definition_id: params.role_definition_id,
            }, dependencies);
            return reply.code(200).send(response);
        }
        catch (error) {
            if (error instanceof UpdateRoleDefinitionStatusError) {
                return reply.code(404).send({
                    error: "Update Role Definition Status Error",
                    message: error.message,
                    statusCode: 404,
                    code: error.code,
                });
            }
            throw error;
        }
    });
};
