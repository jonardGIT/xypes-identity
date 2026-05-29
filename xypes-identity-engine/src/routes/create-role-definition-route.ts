import type {
  CreateRoleDefinitionRequest,
  CreateRoleDefinitionResponse,
} from "@xypes-identity/shared";
import type { FastifyInstance } from "fastify";

import { CreateRoleDefinitionError } from "../domain/role-definition-errors.js";
import type { CreateRoleDefinitionDependencies } from "../domain/role-definition-types.js";
import { createRoleDefinition } from "../services/create-role-definition.js";

const createRoleDefinitionBodySchema = {
  type: "object",
  required: [
    "tenant_id",
    "application_id",
    "name",
    "description",
    "approval_required",
    "actor_principal_id",
    "actor_subject",
    "reason",
  ],
  additionalProperties: false,
  properties: {
    tenant_id: { type: "string", minLength: 1 },
    application_id: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 1 },
    description: { anyOf: [{ type: "string" }, { type: "null" }] },
    approval_required: { type: "boolean" },
    actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    actor_subject: { type: "string", minLength: 1 },
    reason: { type: "string", minLength: 1 },
  },
} as const;

const roleDefinitionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "role_definition_id",
    "tenant_id",
    "application_id",
    "name",
    "description",
    "status",
    "approval_required",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
  ],
  properties: {
    role_definition_id: { type: "string" },
    tenant_id: { type: "string" },
    application_id: { type: "string" },
    name: { type: "string" },
    description: { anyOf: [{ type: "string" }, { type: "null" }] },
    status: { type: "string", enum: ["draft", "active", "deprecated", "retired"] },
    approval_required: { type: "boolean" },
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

const createRoleDefinitionResponseSchema = {
  201: {
    type: "object",
    additionalProperties: false,
    required: ["role_definition", "audit"],
    properties: {
      role_definition: roleDefinitionSchema,
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
  409: errorResponseSchema,
} as const;

export const registerCreateRoleDefinitionRoute = async (
  app: FastifyInstance,
  dependencies: CreateRoleDefinitionDependencies,
): Promise<void> => {
  app.post(
    "/v1/role-definitions",
    {
      schema: {
        body: createRoleDefinitionBodySchema,
        response: createRoleDefinitionResponseSchema,
      },
    },
    async (request, reply) => {
      try {
        const response = await createRoleDefinition(
          request.body as CreateRoleDefinitionRequest,
          dependencies,
        );

        return reply.code(201).send(response satisfies CreateRoleDefinitionResponse);
      } catch (error) {
        if (error instanceof CreateRoleDefinitionError) {
          const statusCode = error.statusCode === 404 || error.statusCode === 409 ? error.statusCode : 409;

          return reply.code(statusCode).send({
            error: "Create Role Definition Error",
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