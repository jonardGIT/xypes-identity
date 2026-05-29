import type { CreateDenyPolicyRequest, CreateDenyPolicyResponse } from "@xypes-identity/shared";
import type { FastifyInstance } from "fastify";

import { CreateDenyPolicyError } from "../domain/deny-policy-errors.js";
import type { CreateDenyPolicyDependencies } from "../domain/deny-policy-types.js";
import { createDenyPolicy } from "../services/create-deny-policy.js";

const createDenyPolicyBodySchema = {
  type: "object",
  required: [
    "tenant_id",
    "permission_id",
    "subject_principal_id",
    "subject_group_id",
    "scope_type",
    "scope_application_id",
    "scope_resource_type",
    "scope_resource_id",
    "reason",
    "actor_principal_id",
    "actor_subject",
    "audit_reason",
  ],
  additionalProperties: false,
  properties: {
    tenant_id: { type: "string", minLength: 1 },
    permission_id: { type: "string", minLength: 1 },
    subject_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    subject_group_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    scope_type: { type: "string", enum: ["platform", "tenant", "application", "resource"] },
    scope_application_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    scope_resource_type: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    scope_resource_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    reason: { anyOf: [{ type: "string" }, { type: "null" }] },
    actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    actor_subject: { type: "string", minLength: 1 },
    audit_reason: { type: "string", minLength: 1 },
  },
} as const;

const denyPolicySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "deny_policy_id",
    "tenant_id",
    "permission_id",
    "subject_principal_id",
    "subject_group_id",
    "scope_type",
    "scope_application_id",
    "scope_resource_type",
    "scope_resource_id",
    "reason",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
  ],
  properties: {
    deny_policy_id: { type: "string" },
    tenant_id: { type: "string" },
    permission_id: { type: "string" },
    subject_principal_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    subject_group_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    scope_type: { type: "string", enum: ["platform", "tenant", "application", "resource"] },
    scope_application_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    scope_resource_type: { anyOf: [{ type: "string" }, { type: "null" }] },
    scope_resource_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    reason: { anyOf: [{ type: "string" }, { type: "null" }] },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    created_by: { type: "string" },
    updated_by: { type: "string" },
  },
} as const;

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

const createDenyPolicyResponseSchema = {
  201: {
    type: "object",
    additionalProperties: false,
    required: ["deny_policy", "audit"],
    properties: {
      deny_policy: denyPolicySchema,
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
  404: errorResponseSchema,
} as const;

export const registerCreateDenyPolicyRoute = async (
  app: FastifyInstance,
  dependencies: CreateDenyPolicyDependencies,
): Promise<void> => {
  app.post(
    "/v1/deny-policies",
    {
      schema: {
        body: createDenyPolicyBodySchema,
        response: createDenyPolicyResponseSchema,
      },
    },
    async (request, reply) => {
      try {
        const response = await createDenyPolicy(
          request.body as CreateDenyPolicyRequest,
          dependencies,
        );

        return reply.code(201).send(response satisfies CreateDenyPolicyResponse);
      } catch (error) {
        if (error instanceof CreateDenyPolicyError) {
          const statusCode = error.statusCode === 400 || error.statusCode === 404 ? error.statusCode : 400;

          return reply.code(statusCode).send({
            error: "Create Deny Policy Error",
            message: error.message,
            statusCode,
            code: error.code,
          });
        }

        throw error;
      }
    },
  );
};