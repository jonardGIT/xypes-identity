import type { XypesIdentityClient } from "@xypes-identity/sdk";
import type { FastifyInstance } from "fastify";

import { mapSdkApiError } from "../error-mapping.js";
import {
  buildOperationsDiagnostics,
  type AdminOperationsDiagnosticsResponse,
} from "../services/build-operations-diagnostics.js";

export type OperationsClient = Pick<XypesIdentityClient["operations"], "getTelemetry">;

export interface OperationsRouteDependencies {
  operations: OperationsClient;
}

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
} as const;

const diagnosticsItemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["label", "value", "status"],
  properties: {
    label: { type: "string" },
    value: {
      anyOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
      ],
    },
    status: { type: "string", enum: ["healthy", "warning", "attention", "inactive"] },
  },
} as const;

const operationsDiagnosticsResponseSchema = {
  200: {
    type: "object",
    additionalProperties: false,
    required: ["generated_at", "summary", "sections"],
    properties: {
      generated_at: { type: "string" },
      summary: {
        type: "object",
        additionalProperties: false,
        required: [
          "token_validation_failures",
          "identity_availability_failures",
          "tenant_access_failures",
          "average_authorize_check_duration_ms",
          "average_authorize_explain_duration_ms",
          "replay_batches_with_failures_total",
          "identity_lifecycle_status",
        ],
        properties: {
          token_validation_failures: { type: "integer", minimum: 0 },
          identity_availability_failures: { type: "integer", minimum: 0 },
          tenant_access_failures: { type: "integer", minimum: 0 },
          average_authorize_check_duration_ms: { type: "number", minimum: 0 },
          average_authorize_explain_duration_ms: { type: "number", minimum: 0 },
          replay_batches_with_failures_total: { type: "integer", minimum: 0 },
          identity_lifecycle_status: {
            type: "string",
            enum: ["active", "degraded", "not_configured"],
          },
        },
      },
      sections: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "title", "items"],
          properties: {
            key: {
              type: "string",
              enum: ["token_validation_failures", "authorization_latency", "rollout_diagnostics"],
            },
            title: { type: "string" },
            items: {
              type: "array",
              items: diagnosticsItemSchema,
            },
          },
        },
      },
    },
  },
  "4xx": errorResponseSchema,
  "5xx": errorResponseSchema,
} as const;

export const registerOperationsRoutes = async (
  app: FastifyInstance,
  dependencies: OperationsRouteDependencies,
): Promise<void> => {
  app.get(
    "/admin/operations/diagnostics",
    {
      schema: {
        response: operationsDiagnosticsResponseSchema,
      },
    },
    async (_request, reply) => {
      try {
        const response = await dependencies.operations.getTelemetry();

        return reply.code(200).send(
          buildOperationsDiagnostics(response) satisfies AdminOperationsDiagnosticsResponse,
        );
      } catch (error) {
        const mappedError = mapSdkApiError(error);

        if (mappedError !== null) {
          return reply.code(mappedError.statusCode).send(mappedError);
        }

        throw error;
      }
    },
  );
};