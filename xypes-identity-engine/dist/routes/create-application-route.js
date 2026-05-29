import { CreateApplicationError } from "../domain/application-errors.js";
import { createApplication } from "../services/create-application.js";
const createApplicationBodySchema = {
    type: "object",
    required: [
        "tenant_id",
        "slug",
        "display_name",
        "actor_principal_id",
        "actor_subject",
        "reason",
    ],
    additionalProperties: false,
    properties: {
        tenant_id: { type: "string", minLength: 1 },
        slug: { type: "string", minLength: 1 },
        display_name: { type: "string", minLength: 1 },
        actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
        actor_subject: { type: "string", minLength: 1 },
        reason: { type: "string", minLength: 1 },
    },
};
const applicationSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "application_id",
        "tenant_id",
        "slug",
        "display_name",
        "status",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    ],
    properties: {
        application_id: { type: "string" },
        tenant_id: { type: "string" },
        slug: { type: "string" },
        display_name: { type: "string" },
        status: { type: "string", enum: ["active", "suspended"] },
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
const createApplicationResponseSchema = {
    201: {
        type: "object",
        additionalProperties: false,
        required: ["application", "audit"],
        properties: {
            application: applicationSchema,
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
    409: errorResponseSchema,
};
export const registerCreateApplicationRoute = async (app, dependencies) => {
    app.post("/v1/applications", {
        schema: {
            body: createApplicationBodySchema,
            response: createApplicationResponseSchema,
        },
    }, async (request, reply) => {
        try {
            const response = await createApplication(request.body, dependencies);
            return reply.code(201).send(response);
        }
        catch (error) {
            if (error instanceof CreateApplicationError) {
                const statusCode = error.statusCode === 409 ? error.statusCode : 409;
                return reply.code(statusCode).send({
                    error: "Create Application Error",
                    message: error.message,
                    statusCode,
                    code: error.code,
                });
            }
            throw error;
        }
    });
};
