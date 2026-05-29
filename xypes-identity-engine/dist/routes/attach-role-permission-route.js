import { AttachRolePermissionError } from "../domain/role-permission-errors.js";
import { attachRolePermission } from "../services/attach-role-permission.js";
const attachRolePermissionBodySchema = {
    type: "object",
    required: [
        "tenant_id",
        "role_definition_id",
        "permission_id",
        "actor_principal_id",
        "actor_subject",
        "reason",
    ],
    additionalProperties: false,
    properties: {
        tenant_id: { type: "string", minLength: 1 },
        role_definition_id: { type: "string", minLength: 1 },
        permission_id: { type: "string", minLength: 1 },
        actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
        actor_subject: { type: "string", minLength: 1 },
        reason: { type: "string", minLength: 1 },
    },
};
const rolePermissionSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "role_permission_id",
        "tenant_id",
        "role_definition_id",
        "permission_id",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    ],
    properties: {
        role_permission_id: { type: "string" },
        tenant_id: { type: "string" },
        role_definition_id: { type: "string" },
        permission_id: { type: "string" },
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
const attachRolePermissionResponseSchema = {
    201: {
        type: "object",
        additionalProperties: false,
        required: ["role_permission", "audit"],
        properties: {
            role_permission: rolePermissionSchema,
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
    409: errorResponseSchema,
};
export const registerAttachRolePermissionRoute = async (app, dependencies) => {
    app.post("/v1/role-permissions", {
        schema: {
            body: attachRolePermissionBodySchema,
            response: attachRolePermissionResponseSchema,
        },
    }, async (request, reply) => {
        try {
            const response = await attachRolePermission(request.body, dependencies);
            return reply.code(201).send(response);
        }
        catch (error) {
            if (error instanceof AttachRolePermissionError) {
                const statusCode = error.statusCode === 404 || error.statusCode === 409 ? error.statusCode : 409;
                return reply.code(statusCode).send({
                    error: "Attach Role Permission Error",
                    message: error.message,
                    statusCode,
                    code: error.code,
                });
            }
            throw error;
        }
    });
};
