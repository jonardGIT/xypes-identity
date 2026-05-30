import type { ListApplicationsRequest, ListApplicationsResponse } from "@xypes-identity/shared";
import type { FastifyInstance } from "fastify";

import type { ListApplicationsDependencies } from "../domain/application-types.js";
import { listApplications } from "../services/list-applications.js";

const applicationStatusSchema = {
  type: "string",
  enum: ["active", "suspended"],
} as const;

const applicationQueryBodySchema = {
  type: "object",
  required: ["tenant_id"],
  additionalProperties: false,
  properties: {
    tenant_id: { type: "string", minLength: 1 },
    limit: { type: "integer", minimum: 1, maximum: 500 },
    application_ids: {
      type: "array",
      items: { type: "string", minLength: 1 },
      uniqueItems: true,
      minItems: 1,
    },
    slug: { type: "string", minLength: 1 },
    statuses: {
      type: "array",
      items: applicationStatusSchema,
      uniqueItems: true,
      minItems: 1,
    },
  },
} as const;

const applicationSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "application_id",
    "tenant_id",
    "slug",
    "display_name",
    "status",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
  ],
  properties: {
    application_id: { type: "string" },
    tenant_id: { type: "string" },
    slug: { type: "string" },
    display_name: { type: "string" },
    status: applicationStatusSchema,
    created_at: { type: "string" },
    updated_at: { type: "string" },
    created_by: { type: "string" },
    updated_by: { type: "string" },
  },
} as const;

const applicationQueryResponseSchema = {
  200: {
    type: "object",
    additionalProperties: false,
    required: ["generated_at", "applications"],
    properties: {
      generated_at: { type: "string" },
      applications: {
        type: "array",
        items: applicationSchema,
      },
    },
  },
} as const;

export const registerListApplicationsRoute = async (
  app: FastifyInstance,
  dependencies: ListApplicationsDependencies,
): Promise<void> => {
  app.post(
    "/v1/applications/query",
    {
      schema: {
        body: applicationQueryBodySchema,
        response: applicationQueryResponseSchema,
      },
    },
    async (request, reply) => {
      const response = await listApplications(
        request.body as ListApplicationsRequest,
        dependencies,
      );

      return reply.code(200).send(response satisfies ListApplicationsResponse);
    },
  );
};