import type { FastifyInstance } from "fastify";

import { authorizeCheck, type AuthorizeCheckServiceDependencies } from "../services/authorize-check.js";

const authorizeCheckBodySchema = {
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
} as const;

const scopeTypeSchema = {
  type: "string",
  enum: ["platform", "tenant", "application", "resource"],
} as const;

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
} as const;

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
} as const;

const authorizeCheckResponseSchema = {
  200: {
    type: "object",
    additionalProperties: false,
    required: ["outcome", "decision_id", "reason_code", "matched_bindings"],
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
    },
  },
} as const;

export interface AuthorizeCheckRouteDependencies extends AuthorizeCheckServiceDependencies {}

export const registerAuthorizeCheckRoute = async (
  app: FastifyInstance,
  dependencies: AuthorizeCheckRouteDependencies,
): Promise<void> => {
  app.post(
    "/v1/authorize/check",
    {
      schema: {
        body: authorizeCheckBodySchema,
        response: authorizeCheckResponseSchema,
      },
    },
    async (request, reply) => {
      const response = await authorizeCheck(
        request.body as {
          tenant_id: string;
          principal_id: string;
          application_id: string;
          action: string;
          resource_type: string;
          resource_id: string | null;
        },
        dependencies,
      );

      return reply.code(200).send({
        ...response,
        deny_source: response.deny_source ?? null,
      });
    },
  );
};