import type {
  UpdateRoleBindingStatusRequest,
  UpdateRoleBindingStatusResponse,
} from "@xypes-identity/shared";
import type { FastifyInstance } from "fastify";

import { UpdateRoleBindingStatusError } from "../domain/role-binding-errors.js";
import type { UpdateRoleBindingStatusDependencies } from "../domain/role-binding-types.js";
import { updateRoleBindingStatus } from "../services/update-role-binding-status.js";

const updateRoleBindingStatusParamsSchema = {
  type: "object",
  required: ["role_binding_id"],
  additionalProperties: false,
  properties: {
    role_binding_id: { type: "string", minLength: 1 },
  },
} as const;

const updateRoleBindingStatusBodySchema = {
  type: "object",
  required: ["tenant_id", "role_binding_status", "actor_principal_id", "actor_subject", "reason"],
  additionalProperties: false,
  properties: {
    tenant_id: { type: "string", minLength: 1 },
    role_binding_status: { type: "string", enum: ["eligible", "active"] },
    actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    actor_subject: { type: "string", minLength: 1 },
    reason: { type: "string", minLength: 1 },
  },
} as const;

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

const updateRoleBindingStatusResponseSchema = {
  200: {
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
  404: errorResponseSchema,
} as const;

export const registerUpdateRoleBindingStatusRoute = async (
  app: FastifyInstance,
  dependencies: UpdateRoleBindingStatusDependencies,
): Promise<void> => {
  app.patch(
    "/v1/role-bindings/:role_binding_id/status",
    {
      schema: {
        params: updateRoleBindingStatusParamsSchema,
        body: updateRoleBindingStatusBodySchema,
        response: updateRoleBindingStatusResponseSchema,
      },
    },
    async (request, reply) => {
      try {
        const params = request.params as { role_binding_id: string };
        const body = request.body as Omit<UpdateRoleBindingStatusRequest, "role_binding_id">;
        const response = await updateRoleBindingStatus(
          {
            ...body,
            role_binding_id: params.role_binding_id,
          },
          dependencies,
        );

        return reply.code(200).send(response satisfies UpdateRoleBindingStatusResponse);
      } catch (error) {
        if (error instanceof UpdateRoleBindingStatusError) {
          return reply.code(404).send({
            error: "Update Role Binding Status Error",
            message: error.message,
            statusCode: 404,
            code: error.code,
          });
        }

        throw error;
      }
    },
  );
};