import type { CreateGroupRequest, CreateGroupResponse } from "@xypes-identity/shared";
import type { FastifyInstance } from "fastify";

import { CreateGroupError } from "../domain/group-errors.js";
import type { CreateGroupDependencies } from "../domain/group-types.js";
import { createGroup } from "../services/create-group.js";

const createGroupBodySchema = {
  type: "object",
  required: [
    "tenant_id",
    "scope_application_id",
    "name",
    "description",
    "group_type",
    "owner_principal_id",
    "scope_type",
    "scope_resource_type",
    "scope_resource_id",
    "actor_principal_id",
    "actor_subject",
    "reason",
  ],
  additionalProperties: false,
  properties: {
    tenant_id: { type: "string", minLength: 1 },
    scope_application_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    name: { type: "string", minLength: 1 },
    description: { anyOf: [{ type: "string" }, { type: "null" }] },
    group_type: { type: "string", enum: ["manual", "synced", "rule_based"] },
    owner_principal_id: { type: "string", minLength: 1 },
    scope_type: { type: "string", enum: ["platform", "tenant", "application", "resource"] },
    scope_resource_type: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    scope_resource_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    actor_subject: { type: "string", minLength: 1 },
    reason: { type: "string", minLength: 1 },
  },
} as const;

const groupSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "group_id",
    "tenant_id",
    "scope_application_id",
    "name",
    "description",
    "group_type",
    "owner_principal_id",
    "scope_type",
    "scope_resource_type",
    "scope_resource_id",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
  ],
  properties: {
    group_id: { type: "string" },
    tenant_id: { type: "string" },
    scope_application_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    name: { type: "string" },
    description: { anyOf: [{ type: "string" }, { type: "null" }] },
    group_type: { type: "string", enum: ["manual", "synced", "rule_based"] },
    owner_principal_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    scope_type: { type: "string", enum: ["platform", "tenant", "application", "resource"] },
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

const createGroupResponseSchema = {
  201: {
    type: "object",
    additionalProperties: false,
    required: ["group", "audit"],
    properties: {
      group: groupSchema,
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
  409: errorResponseSchema,
} as const;

export const registerCreateGroupRoute = async (
  app: FastifyInstance,
  dependencies: CreateGroupDependencies,
): Promise<void> => {
  app.post(
    "/v1/groups",
    {
      schema: {
        body: createGroupBodySchema,
        response: createGroupResponseSchema,
      },
    },
    async (request, reply) => {
      try {
        const response = await createGroup(request.body as CreateGroupRequest, dependencies);

        return reply.code(201).send(response satisfies CreateGroupResponse);
      } catch (error) {
        if (error instanceof CreateGroupError) {
          const statusCode: 400 | 404 | 409 = [400, 404, 409].includes(error.statusCode)
            ? (error.statusCode as 400 | 404 | 409)
            : 400;

          return reply.code(statusCode).send({
            error: "Create Group Error",
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