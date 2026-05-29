import type { ListAuditEventsRequest, ListAuditEventsResponse } from "@xypes-identity/shared";
import type { FastifyInstance } from "fastify";

import type { ListAuditEventsDependencies } from "../domain/audit-event-types.js";
import { listAuditEvents } from "../services/list-audit-events.js";

const auditEventsBodySchema = {
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

const auditEventsResponseSchema = {
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
} as const;

export const registerAuditEventsRoute = async (
  app: FastifyInstance,
  dependencies: ListAuditEventsDependencies,
): Promise<void> => {
  app.post(
    "/v1/audit-events/query",
    {
      schema: {
        body: auditEventsBodySchema,
        response: auditEventsResponseSchema,
      },
    },
    async (request, reply) => {
      const response = await listAuditEvents(
        request.body as ListAuditEventsRequest,
        dependencies,
      );

      return reply.code(200).send(response satisfies ListAuditEventsResponse);
    },
  );
};