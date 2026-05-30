import type { FastifyInstance } from "fastify";

import type { RunIdentityReconciliationDependencies } from "../domain/identity-reconciliation-types.js";
import { runIdentityReconciliation } from "../services/run-identity-reconciliation.js";

const anomalySchema = {
  type: "object",
  additionalProperties: false,
  required: ["code", "principal_id", "subject", "tenant_id", "observed_count"],
  properties: {
    code: {
      type: "string",
      enum: [
        "ORPHANED_PRINCIPAL",
        "DUPLICATE_SUBJECT_MAPPING",
        "SUSPENDED_PRINCIPAL_ACTIVE_MEMBERSHIP",
      ],
    },
    principal_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    subject: { anyOf: [{ type: "string" }, { type: "null" }] },
    tenant_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    observed_count: { type: "integer", minimum: 1 },
  },
} as const;

const responseSchema = {
  200: {
    type: "object",
    additionalProperties: false,
    required: ["generated_at", "status", "summary", "anomalies"],
    properties: {
      generated_at: { type: "string" },
      status: { type: "string", enum: ["ok", "drift_detected"] },
      summary: {
        type: "object",
        additionalProperties: false,
        required: [
          "principals_scanned",
          "tenant_memberships_scanned",
          "anomalies_detected",
          "orphaned_principals",
          "duplicate_subject_mappings",
          "suspended_principal_active_memberships",
        ],
        properties: {
          principals_scanned: { type: "integer", minimum: 0 },
          tenant_memberships_scanned: { type: "integer", minimum: 0 },
          anomalies_detected: { type: "integer", minimum: 0 },
          orphaned_principals: { type: "integer", minimum: 0 },
          duplicate_subject_mappings: { type: "integer", minimum: 0 },
          suspended_principal_active_memberships: { type: "integer", minimum: 0 },
        },
      },
      anomalies: {
        type: "array",
        items: anomalySchema,
      },
    },
  },
} as const;

export const registerOperationsIdentityReconciliationRoute = async (
  app: FastifyInstance,
  dependencies: RunIdentityReconciliationDependencies,
): Promise<void> => {
  app.post(
    "/v1/operations/identity-reconciliation/run",
    {
      schema: {
        response: responseSchema,
      },
    },
    async (_request, reply) => {
      const response = await runIdentityReconciliation(dependencies);

      return reply.code(200).send(response);
    },
  );
};