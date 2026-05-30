import type { ListPermissionsRequest, ListPermissionsResponse } from "@xypes-identity/shared";
import type { FastifyInstance } from "fastify";

import type { ListPermissionsDependencies } from "../domain/permission-types.js";
import { listPermissions } from "../services/list-permissions.js";

const permissionsQueryBodySchema = {
  type: "object",
  required: ["tenant_id"],
  additionalProperties: false,
  properties: {
    tenant_id: { type: "string", minLength: 1 },
    limit: { type: "integer", minimum: 1, maximum: 500 },
    application_id: { type: "string", minLength: 1 },
    permission_ids: {
      type: "array",
      items: { type: "string", minLength: 1 },
      uniqueItems: true,
      minItems: 1,
    },
    action: { type: "string", minLength: 1 },
    resource_type: { type: "string", minLength: 1 },
  },
} as const;

const permissionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "permission_id",
    "tenant_id",
    "application_id",
    "action",
    "resource_type",
    "description",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
  ],
  properties: {
    permission_id: { type: "string" },
    tenant_id: { type: "string" },
    application_id: { type: "string" },
    action: { type: "string" },
    resource_type: { type: "string" },
    description: { anyOf: [{ type: "string" }, { type: "null" }] },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    created_by: { type: "string" },
    updated_by: { type: "string" },
  },
} as const;

const permissionsQueryResponseSchema = {
  200: {
    type: "object",
    additionalProperties: false,
    required: ["generated_at", "permissions"],
    properties: {
      generated_at: { type: "string" },
      permissions: {
        type: "array",
        items: permissionSchema,
      },
    },
  },
} as const;

export const registerListPermissionsRoute = async (
  app: FastifyInstance,
  dependencies: ListPermissionsDependencies,
): Promise<void> => {
  app.post(
    "/v1/permissions/query",
    {
      schema: {
        body: permissionsQueryBodySchema,
        response: permissionsQueryResponseSchema,
      },
    },
    async (request, reply) => {
      const response = await listPermissions(
        request.body as ListPermissionsRequest,
        dependencies,
      );

      return reply.code(200).send(response satisfies ListPermissionsResponse);
    },
  );
};