import { CreateRoleBindingError } from "../domain/role-binding-errors.js";
import { createRoleBinding } from "../services/create-role-binding.js";
const createRoleBindingBodySchema = {
    type: "object",
    required: [
        "tenant_id",
        "role_definition_id",
        "subject_principal_id",
        "subject_group_id",
        "scope_type",
        "scope_application_id",
        "scope_resource_type",
        "scope_resource_id",
        "actor_principal_id",
        "actor_subject",
        "reason",
    ],
    additionalProperties: false,
    properties: {
        tenant_id: { type: "string", minLength: 1 },
        role_definition_id: { type: "string", minLength: 1 },
        subject_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
        subject_group_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
        scope_type: { type: "string", enum: ["platform", "tenant", "application", "resource"] },
        scope_application_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
        scope_resource_type: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
        scope_resource_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
        actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
        actor_subject: { type: "string", minLength: 1 },
        reason: { type: "string", minLength: 1 },
    },
};
const roleBindingSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "role_binding_id",
        "tenant_id",
        "role_definition_id",
        "role_binding_status",
        "subject_principal_id",
        "subject_group_id",
        "scope_type",
        "scope_application_id",
        "scope_resource_type",
        "scope_resource_id",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    ],
    properties: {
        role_binding_id: { type: "string" },
        tenant_id: { type: "string" },
        role_definition_id: { type: "string" },
        role_binding_status: { type: "string", enum: ["eligible", "active"] },
        subject_principal_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        subject_group_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        scope_type: { type: "string", enum: ["platform", "tenant", "application", "resource"] },
        scope_application_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        scope_resource_type: { anyOf: [{ type: "string" }, { type: "null" }] },
        scope_resource_id: { anyOf: [{ type: "string" }, { type: "null" }] },
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
const createRoleBindingResponseSchema = {
    201: {
        type: "object",
        additionalProperties: false,
        required: ["role_binding", "audit"],
        properties: {
            role_binding: roleBindingSchema,
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
    400: errorResponseSchema,
    409: errorResponseSchema,
    404: errorResponseSchema,
};
export const registerCreateRoleBindingRoute = async (app, dependencies) => {
    app.post("/v1/role-bindings", {
        schema: {
            body: createRoleBindingBodySchema,
            response: createRoleBindingResponseSchema,
        },
    }, async (request, reply) => {
        try {
            const response = await createRoleBinding(request.body, dependencies);
            return reply.code(201).send(response);
        }
        catch (error) {
            if (error instanceof CreateRoleBindingError) {
                const statusCode = error.statusCode === 400 || error.statusCode === 404 || error.statusCode === 409
                    ? error.statusCode
                    : 400;
                return reply.code(statusCode).send({
                    error: "Create Role Binding Error",
                    message: error.message,
                    statusCode,
                    code: error.code,
                });
            }
            throw error;
        }
    });
};
