import { coreApiReferenceDocument } from "@xypes-identity/shared";
const apiReferenceResponseSchema = {
    200: {
        type: "object",
        additionalProperties: false,
        required: ["generated_at", "endpoints"],
        properties: {
            generated_at: { type: "string" },
            endpoints: {
                type: "array",
                items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                        "operation_id",
                        "method",
                        "path",
                        "summary",
                        "request_examples",
                        "success_examples",
                        "error_codes",
                        "notes",
                    ],
                    properties: {
                        operation_id: { type: "string" },
                        method: { type: "string" },
                        path: { type: "string" },
                        summary: { type: "string" },
                        request_examples: { type: "array", items: { type: "object" } },
                        success_examples: { type: "array", items: { type: "object" } },
                        error_codes: { type: "array", items: { type: "string" } },
                        notes: { type: "array", items: { type: "string" } },
                    },
                },
            },
        },
    },
};
export const registerCoreApiReferenceRoute = async (app, dependencies) => {
    app.get("/v1/meta/api-reference", {
        schema: {
            response: apiReferenceResponseSchema,
        },
    }, async (_request, reply) => reply.code(200).send({
        generated_at: dependencies.clock.now().toISOString(),
        ...coreApiReferenceDocument,
    }));
};
