import { ResolveSessionError } from "../domain/auth-errors.js";
import { resolveSession } from "../services/resolve-session.js";
const resolveSessionBodySchema = {
    type: "object",
    required: ["token", "tenant_id"],
    additionalProperties: false,
    properties: {
        token: { type: "string", minLength: 1 },
        tenant_id: { type: "string", minLength: 1 },
    },
};
const principalSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "principal_id",
        "tenant_id",
        "subject",
        "email",
        "principal_status",
        "membership_status",
    ],
    properties: {
        principal_id: { type: "string" },
        tenant_id: { type: "string" },
        subject: { type: "string" },
        email: { anyOf: [{ type: "string" }, { type: "null" }] },
        principal_status: { type: "string", enum: ["active", "suspended"] },
        membership_status: { type: "string", enum: ["active", "suspended"] },
    },
};
const resolveSessionResponseSchema = {
    200: {
        type: "object",
        additionalProperties: false,
        required: ["decision_id", "principal"],
        properties: {
            decision_id: { type: "string" },
            principal: principalSchema,
        },
    },
    401: {
        type: "object",
        additionalProperties: false,
        required: ["error", "message", "statusCode", "code"],
        properties: {
            error: { type: "string" },
            message: { type: "string" },
            statusCode: { type: "number" },
            code: { type: "string" },
        },
    },
    403: {
        type: "object",
        additionalProperties: false,
        required: ["error", "message", "statusCode", "code"],
        properties: {
            error: { type: "string" },
            message: { type: "string" },
            statusCode: { type: "number" },
            code: { type: "string" },
        },
    },
    404: {
        type: "object",
        additionalProperties: false,
        required: ["error", "message", "statusCode", "code"],
        properties: {
            error: { type: "string" },
            message: { type: "string" },
            statusCode: { type: "number" },
            code: { type: "string" },
        },
    },
    503: {
        type: "object",
        additionalProperties: false,
        required: ["error", "message", "statusCode", "code"],
        properties: {
            error: { type: "string" },
            message: { type: "string" },
            statusCode: { type: "number" },
            code: { type: "string" },
        },
    },
};
export const registerResolveSessionRoute = async (app, dependencies) => {
    app.post("/v1/auth/resolve-session", {
        schema: {
            body: resolveSessionBodySchema,
            response: resolveSessionResponseSchema,
        },
    }, async (request, reply) => {
        try {
            const response = await resolveSession(request.body, dependencies);
            return reply.code(200).send(response);
        }
        catch (error) {
            if (error instanceof ResolveSessionError) {
                const statusCode = error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404 || error.statusCode === 503
                    ? error.statusCode
                    : 401;
                return reply.code(statusCode).send({
                    error: "Resolve Session Error",
                    message: error.message,
                    statusCode,
                    code: error.code,
                });
            }
            throw error;
        }
    });
};
