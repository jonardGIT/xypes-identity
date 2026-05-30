import type {
  ListRoleDefinitionsRequest,
  ListRoleDefinitionsResponse,
} from "@xypes-identity/shared";
import type { FastifyInstance } from "fastify";

import type { ListRoleDefinitionsDependencies } from "../domain/role-definition-types.js";
import { listRoleDefinitions } from "../services/list-role-definitions.js";

const roleDefinitionStatusSchema = {
  type: "string",
  enum: ["draft", "active", "deprecated", "retired"],
} as const;

const roleDefinitionsQueryBodySchema = {
  type: "object",
  required: ["tenant_id"],
  additionalProperties: false,
  properties: {
    tenant_id: { type: "string", minLength: 1 },
    limit: { type: "integer", minimum: 1, maximum: 500 },
    application_id: { type: "string", minLength: 1 },
    role_definition_ids: {
      type: "array",
      items: { type: "string", minLength: 1 },
      uniqueItems: true,
      minItems: 1,
    },
    statuses: {
      type: "array",
      items: roleDefinitionStatusSchema,
      uniqueItems: true,
      minItems: 1,
    },
    approval_required: { type: "boolean" },
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
    status: roleDefinitionStatusSchema,
    approval_required: { type: "boolean" },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    created_by: { type: "string" },
    updated_by: { type: "string" },
  },
} as const;

const roleDefinitionsQueryResponseSchema = {
  200: {
    type: "object",
    additionalProperties: false,
    required: ["generated_at", "role_definitions"],
    properties: {
      generated_at: { type: "string" },
      role_definitions: {
        type: "array",
        items: roleDefinitionSchema,
      },
    },
  },
} as const;

export const registerListRoleDefinitionsRoute = async (
  app: FastifyInstance,
  dependencies: ListRoleDefinitionsDependencies,
): Promise<void> => {
  app.post(
    "/v1/role-definitions/query",
    {
      schema: {
        body: roleDefinitionsQueryBodySchema,
        response: roleDefinitionsQueryResponseSchema,
      },
    },
    async (request, reply) => {
      const response = await listRoleDefinitions(
        request.body as ListRoleDefinitionsRequest,
        dependencies,
      );

      return reply.code(200).send(response satisfies ListRoleDefinitionsResponse);
    },
  );
};