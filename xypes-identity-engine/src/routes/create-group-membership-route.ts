import type {
  CreateGroupMembershipRequest,
  CreateGroupMembershipResponse,
} from "@xypes-identity/shared";
import type { FastifyInstance } from "fastify";

import { CreateGroupMembershipError } from "../domain/group-membership-errors.js";
import type { CreateGroupMembershipDependencies } from "../domain/group-membership-types.js";
import { createGroupMembership } from "../services/create-group-membership.js";

const createGroupMembershipBodySchema = {
  type: "object",
  required: [
    "tenant_id",
    "group_id",
    "member_principal_id",
    "member_group_id",
    "membership_source",
    "actor_principal_id",
    "actor_subject",
    "reason",
  ],
  additionalProperties: false,
  properties: {
    tenant_id: { type: "string", minLength: 1 },
    group_id: { type: "string", minLength: 1 },
    member_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    member_group_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    membership_source: { type: "string", enum: ["manual", "synced", "rule_based"] },
    actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    actor_subject: { type: "string", minLength: 1 },
    reason: { type: "string", minLength: 1 },
  },
} as const;

const groupMembershipSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "group_membership_id",
    "tenant_id",
    "group_id",
    "member_principal_id",
    "member_group_id",
    "membership_source",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
  ],
  properties: {
    group_membership_id: { type: "string" },
    tenant_id: { type: "string" },
    group_id: { type: "string" },
    member_principal_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    member_group_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    membership_source: { type: "string", enum: ["manual", "synced", "rule_based"] },
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

const createGroupMembershipResponseSchema = {
  201: {
    type: "object",
    additionalProperties: false,
    required: ["group_membership", "audit"],
    properties: {
      group_membership: groupMembershipSchema,
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

export const registerCreateGroupMembershipRoute = async (
  app: FastifyInstance,
  dependencies: CreateGroupMembershipDependencies,
): Promise<void> => {
  app.post(
    "/v1/group-memberships",
    {
      schema: {
        body: createGroupMembershipBodySchema,
        response: createGroupMembershipResponseSchema,
      },
    },
    async (request, reply) => {
      try {
        const response = await createGroupMembership(
          request.body as CreateGroupMembershipRequest,
          dependencies,
        );

        return reply.code(201).send(response satisfies CreateGroupMembershipResponse);
      } catch (error) {
        if (error instanceof CreateGroupMembershipError) {
          const statusCode = error.statusCode === 404 ? 404 : 400;

          return reply.code(statusCode).send({
            error: "Create Group Membership Error",
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