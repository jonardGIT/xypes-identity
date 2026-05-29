import type {
  ListAuditEventsRequest,
  ListAuditEventsResponse,
  XypesIdentityClient,
} from "@xypes-identity/sdk";
import type { FastifyInstance } from "fastify";

import { mapSdkApiError } from "../error-mapping.js";
import {
  buildAuditWorkbench,
  type AdminAuditWorkbenchResponse,
} from "../services/build-audit-workbench.js";

export type AuditClient = Pick<XypesIdentityClient["audit"], "listEvents">;

export interface AuditRouteDependencies {
  audit: AuditClient;
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

const listAuditEventsBodySchema = {
  type: "object",
  required: ["tenant_id"],
  additionalProperties: false,
  properties: {
    tenant_id: { type: "string", minLength: 1 },
    limit: { type: "integer", minimum: 1, maximum: 500 },
    event_types: {
      type: "array",
      items: { type: "string", minLength: 1 },
      uniqueItems: true,
      minItems: 1,
    },
    entity_type: { type: "string", minLength: 1 },
    entity_id: { type: "string", minLength: 1 },
    actor_subject: { type: "string", minLength: 1 },
    correlation_id: { type: "string", minLength: 1 },
    reference_type: { type: "string", minLength: 1 },
    reference_id: { type: "string", minLength: 1 },
    occurred_after: { type: "string", minLength: 1 },
  },
} as const;

const jsonValueSchema = {} as const;

const auditEventSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "audit_event_id",
    "tenant_id",
    "event_type",
    "entity_type",
    "entity_id",
    "actor_principal_id",
    "actor_subject",
    "reason",
    "before_payload",
    "after_payload",
    "correlation_id",
    "reference_type",
    "reference_id",
    "occurred_at",
  ],
  properties: {
    audit_event_id: { type: "string" },
    tenant_id: { type: "string" },
    event_type: { type: "string" },
    entity_type: { type: "string" },
    entity_id: { type: "string" },
    actor_principal_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    actor_subject: { type: "string" },
    reason: { type: "string" },
    before_payload: jsonValueSchema,
    after_payload: jsonValueSchema,
    correlation_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    reference_type: { anyOf: [{ type: "string" }, { type: "null" }] },
    reference_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    occurred_at: { type: "string" },
  },
} as const;

const listAuditEventsResponseSchema = {
  200: {
    type: "object",
    additionalProperties: false,
    required: ["generated_at", "events"],
    properties: {
      generated_at: { type: "string" },
      events: {
        type: "array",
        items: auditEventSchema,
      },
    },
  },
  "4xx": errorResponseSchema,
  "5xx": errorResponseSchema,
} as const;

const auditWorkbenchCountSchema = {
  type: "object",
  additionalProperties: false,
  required: ["event_type", "total"],
  properties: {
    event_type: { type: "string" },
    total: { type: "integer", minimum: 0 },
  },
} as const;

const auditWorkbenchSectionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["entity_type", "total_events", "last_occurred_at", "events"],
  properties: {
    entity_type: { type: "string" },
    total_events: { type: "integer", minimum: 0 },
    last_occurred_at: { anyOf: [{ type: "string" }, { type: "null" }] },
    events: {
      type: "array",
      items: auditEventSchema,
    },
  },
} as const;

const auditWorkbenchResponseSchema = {
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
          "total_events",
          "distinct_actor_subjects",
          "distinct_entity_types",
          "status_update_events",
          "counts_by_event_type",
        ],
        properties: {
          total_events: { type: "integer", minimum: 0 },
          distinct_actor_subjects: { type: "integer", minimum: 0 },
          distinct_entity_types: { type: "integer", minimum: 0 },
          status_update_events: { type: "integer", minimum: 0 },
          counts_by_event_type: {
            type: "array",
            items: auditWorkbenchCountSchema,
          },
        },
      },
      sections: {
        type: "array",
        items: auditWorkbenchSectionSchema,
      },
    },
  },
  "4xx": errorResponseSchema,
  "5xx": errorResponseSchema,
} as const;

export const registerAuditRoutes = async (
  app: FastifyInstance,
  dependencies: AuditRouteDependencies,
): Promise<void> => {
  app.post(
    "/admin/audit-events/workbench",
    {
      schema: {
        body: listAuditEventsBodySchema,
        response: auditWorkbenchResponseSchema,
      },
    },
    async (request, reply) => {
      try {
        const response = await dependencies.audit.listEvents(
          request.body as ListAuditEventsRequest,
        );

        return reply.code(200).send(
          buildAuditWorkbench(response) satisfies AdminAuditWorkbenchResponse,
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

  app.post(
    "/admin/audit-events/query",
    {
      schema: {
        body: listAuditEventsBodySchema,
        response: listAuditEventsResponseSchema,
      },
    },
    async (request, reply) => {
      try {
        const response = await dependencies.audit.listEvents(
          request.body as ListAuditEventsRequest,
        );

        return reply.code(200).send(response satisfies ListAuditEventsResponse);
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