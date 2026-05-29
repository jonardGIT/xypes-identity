import { CreatePermissionError } from "../domain/permission-errors.js";
import { createPermission } from "../services/create-permission.js";
const createPermissionBodySchema = {
    type: "object",
    required: [
        "tenant_id",
        "application_id",
        "action",
        "resource_type",
        "actor_principal_id",
        "actor_subject",
        "reason",
    ],
    additionalProperties: false,
    properties: {
        tenant_id: { type: "string", minLength: 1 },
        application_id: { type: "string", minLength: 1 },
        action: { type: "string", minLength: 1 },
        resource_type: { type: "string", minLength: 1 },
        description: { anyOf: [{ type: "string" }, { type: "null" }] },
        actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
        actor_subject: { type: "string", minLength: 1 },
        reason: { type: "string", minLength: 1 },
    },
};
const permissionSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "permission_id",
        "tenant_id",
        "application_id",
        "action",
        "resource_type",
        "description",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    ],
    properties: {
        permission_id: { type: "string" },
        tenant_id: { type: "string" },
        application_id: { type: "string" },
        action: { type: "string" },
        resource_type: { type: "string" },
        description: { anyOf: [{ type: "string" }, { type: "null" }] },
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
const createPermissionResponseSchema = {
    201: {
        type: "object",
        additionalProperties: false,
        required: ["permission", "audit"],
        properties: {
            permission: permissionSchema,
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
export const registerCreatePermissionRoute = async (app, dependencies) => {
    app.post("/v1/permissions", {
        schema: {
            body: createPermissionBodySchema,
            response: createPermissionResponseSchema,
        },
    }, async (request, reply) => {
        try {
            const response = await createPermission(request.body, dependencies);
            return reply.code(201).send(response);
        }
        catch (error) {
            if (error instanceof CreatePermissionError) {
                const statusCode = error.statusCode === 404 || error.statusCode === 409 ? error.statusCode : 409;
                return reply.code(statusCode).send({
                    error: "Create Permission Error",
                    message: error.message,
                    statusCode,
                    code: error.code,
                });
            }
            throw error;
        }
    });
};
