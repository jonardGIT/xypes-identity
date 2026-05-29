import type {
  AttachRolePermissionRequest,
  AttachRolePermissionResponse,
  CreateApplicationRequest,
  CreateApplicationResponse,
  CreateDenyPolicyRequest,
  CreateDenyPolicyResponse,
  CreateGroupMembershipRequest,
  CreateGroupMembershipResponse,
  CreateGroupRequest,
  CreateGroupResponse,
  CreatePermissionRequest,
  CreatePermissionResponse,
  CreateRoleBindingRequest,
  CreateRoleBindingResponse,
  UpdateRoleBindingStatusRequest,
  UpdateRoleBindingStatusResponse,
  XypesIdentityClient,
} from "@xypes-identity/sdk";
import type { FastifyInstance } from "fastify";

import { mapSdkApiError } from "../error-mapping.js";

export type ControlPlaneClient = Pick<
  XypesIdentityClient["controlPlane"],
  | "attachRolePermission"
  | "createApplication"
  | "createDenyPolicy"
  | "createGroup"
  | "createGroupMembership"
  | "createPermission"
  | "createRoleBinding"
  | "updateRoleBindingStatus"
>;

export interface ControlPlaneRouteDependencies {
  controlPlane: ControlPlaneClient;
}

const scopeTypeSchema = {
  type: "string",
  enum: ["platform", "tenant", "application", "resource"],
} as const;

const auditSchema = {
  type: "object",
  additionalProperties: false,
  required: ["audit_event_id"],
  properties: {
    audit_event_id: { type: "string" },
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
    status: { type: "string", enum: ["active", "suspended"] },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    created_by: { type: "string" },
    updated_by: { type: "string" },
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
    scope_type: scopeTypeSchema,
    scope_resource_type: { anyOf: [{ type: "string" }, { type: "null" }] },
    scope_resource_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    created_by: { type: "string" },
    updated_by: { type: "string" },
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
    scope_type: scopeTypeSchema,
    scope_application_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    scope_resource_type: { anyOf: [{ type: "string" }, { type: "null" }] },
    scope_resource_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    created_by: { type: "string" },
    updated_by: { type: "string" },
  },
} as const;

const rolePermissionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "role_permission_id",
    "tenant_id",
    "role_definition_id",
    "permission_id",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
  ],
  properties: {
    role_permission_id: { type: "string" },
    tenant_id: { type: "string" },
    role_definition_id: { type: "string" },
    permission_id: { type: "string" },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    created_by: { type: "string" },
    updated_by: { type: "string" },
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
    scope_type: scopeTypeSchema,
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

const createApplicationBodySchema = {
  type: "object",
  required: [
    "tenant_id",
    "slug",
    "display_name",
    "actor_principal_id",
    "actor_subject",
    "reason",
  ],
  additionalProperties: false,
  properties: {
    tenant_id: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 1 },
    display_name: { type: "string", minLength: 1 },
    actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    actor_subject: { type: "string", minLength: 1 },
    reason: { type: "string", minLength: 1 },
  },
} as const;

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
    scope_type: scopeTypeSchema,
    scope_resource_type: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    scope_resource_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    actor_subject: { type: "string", minLength: 1 },
    reason: { type: "string", minLength: 1 },
  },
} as const;

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

const createPermissionBodySchema = {
  type: "object",
  required: [
    "tenant_id",
    "application_id",
    "action",
    "resource_type",
    "description",
    "actor_principal_id",
    "actor_subject",
    "reason",
  ],
  additionalProperties: false,
  properties: {
    tenant_id: { type: "string", minLength: 1 },
    application_id: { type: "string", minLength: 1 },
    action: { type: "string", minLength: 1 },
    resource_type: { type: "string", minLength: 1 },
    description: { anyOf: [{ type: "string" }, { type: "null" }] },
    actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    actor_subject: { type: "string", minLength: 1 },
    reason: { type: "string", minLength: 1 },
  },
} as const;

const createRoleBindingBodySchema = {
  type: "object",
  required: [
    "tenant_id",
    "role_definition_id",
    "subject_principal_id",
    "subject_group_id",
    "scope_type",
    "scope_application_id",
    "scope_resource_type",
    "scope_resource_id",
    "actor_principal_id",
    "actor_subject",
    "reason",
  ],
  additionalProperties: false,
  properties: {
    tenant_id: { type: "string", minLength: 1 },
    role_definition_id: { type: "string", minLength: 1 },
    subject_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    subject_group_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    scope_type: scopeTypeSchema,
    scope_application_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    scope_resource_type: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    scope_resource_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    actor_subject: { type: "string", minLength: 1 },
    reason: { type: "string", minLength: 1 },
  },
} as const;

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

const attachRolePermissionBodySchema = {
  type: "object",
  required: [
    "tenant_id",
    "role_definition_id",
    "permission_id",
    "actor_principal_id",
    "actor_subject",
    "reason",
  ],
  additionalProperties: false,
  properties: {
    tenant_id: { type: "string", minLength: 1 },
    role_definition_id: { type: "string", minLength: 1 },
    permission_id: { type: "string", minLength: 1 },
    actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    actor_subject: { type: "string", minLength: 1 },
    reason: { type: "string", minLength: 1 },
  },
} as const;

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
    scope_type: scopeTypeSchema,
    scope_application_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    scope_resource_type: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    scope_resource_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    reason: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    actor_principal_id: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    actor_subject: { type: "string", minLength: 1 },
    audit_reason: { type: "string", minLength: 1 },
  },
} as const;

const createApplicationResponseSchema = {
  201: {
    type: "object",
    additionalProperties: false,
    required: ["application", "audit"],
    properties: {
      application: applicationSchema,
      audit: auditSchema,
    },
  },
  "4xx": errorResponseSchema,
  "5xx": errorResponseSchema,
} as const;

const createGroupResponseSchema = {
  201: {
    type: "object",
    additionalProperties: false,
    required: ["group", "audit"],
    properties: {
      group: groupSchema,
      audit: auditSchema,
    },
  },
  "4xx": errorResponseSchema,
  "5xx": errorResponseSchema,
} as const;

const createGroupMembershipResponseSchema = {
  201: {
    type: "object",
    additionalProperties: false,
    required: ["group_membership", "audit"],
    properties: {
      group_membership: groupMembershipSchema,
      audit: auditSchema,
    },
  },
  "4xx": errorResponseSchema,
  "5xx": errorResponseSchema,
} as const;

const createPermissionResponseSchema = {
  201: {
    type: "object",
    additionalProperties: false,
    required: ["permission", "audit"],
    properties: {
      permission: permissionSchema,
      audit: auditSchema,
    },
  },
  "4xx": errorResponseSchema,
  "5xx": errorResponseSchema,
} as const;

const createRoleBindingResponseSchema = {
  201: {
    type: "object",
    additionalProperties: false,
    required: ["role_binding", "audit"],
    properties: {
      role_binding: roleBindingSchema,
      audit: auditSchema,
    },
  },
  "4xx": errorResponseSchema,
  "5xx": errorResponseSchema,
} as const;

const updateRoleBindingStatusResponseSchema = {
  200: {
    type: "object",
    additionalProperties: false,
    required: ["role_binding", "audit"],
    properties: {
      role_binding: roleBindingSchema,
      audit: auditSchema,
    },
  },
  "4xx": errorResponseSchema,
  "5xx": errorResponseSchema,
} as const;

const attachRolePermissionResponseSchema = {
  201: {
    type: "object",
    additionalProperties: false,
    required: ["role_permission", "audit"],
    properties: {
      role_permission: rolePermissionSchema,
      audit: auditSchema,
    },
  },
  "4xx": errorResponseSchema,
  "5xx": errorResponseSchema,
} as const;

const createDenyPolicyResponseSchema = {
  201: {
    type: "object",
    additionalProperties: false,
    required: ["deny_policy", "audit"],
    properties: {
      deny_policy: denyPolicySchema,
      audit: auditSchema,
    },
  },
  "4xx": errorResponseSchema,
  "5xx": errorResponseSchema,
} as const;

export const registerControlPlaneRoutes = async (
  app: FastifyInstance,
  dependencies: ControlPlaneRouteDependencies,
): Promise<void> => {
  app.post(
    "/admin/applications",
    {
      schema: {
        body: createApplicationBodySchema,
        response: createApplicationResponseSchema,
      },
    },
    async (request, reply) => {
      try {
        const response = await dependencies.controlPlane.createApplication(
          request.body as CreateApplicationRequest,
        );

        return reply.code(201).send(response satisfies CreateApplicationResponse);
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
    "/admin/groups",
    {
      schema: {
        body: createGroupBodySchema,
        response: createGroupResponseSchema,
      },
    },
    async (request, reply) => {
      try {
        const response = await dependencies.controlPlane.createGroup(
          request.body as CreateGroupRequest,
        );

        return reply.code(201).send(response satisfies CreateGroupResponse);
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
    "/admin/group-memberships",
    {
      schema: {
        body: createGroupMembershipBodySchema,
        response: createGroupMembershipResponseSchema,
      },
    },
    async (request, reply) => {
      try {
        const response = await dependencies.controlPlane.createGroupMembership(
          request.body as CreateGroupMembershipRequest,
        );

        return reply.code(201).send(response satisfies CreateGroupMembershipResponse);
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
    "/admin/permissions",
    {
      schema: {
        body: createPermissionBodySchema,
        response: createPermissionResponseSchema,
      },
    },
    async (request, reply) => {
      try {
        const response = await dependencies.controlPlane.createPermission(
          request.body as CreatePermissionRequest,
        );

        return reply.code(201).send(response satisfies CreatePermissionResponse);
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
    "/admin/role-bindings",
    {
      schema: {
        body: createRoleBindingBodySchema,
        response: createRoleBindingResponseSchema,
      },
    },
    async (request, reply) => {
      try {
        const response = await dependencies.controlPlane.createRoleBinding(
          request.body as CreateRoleBindingRequest,
        );

        return reply.code(201).send(response satisfies CreateRoleBindingResponse);
      } catch (error) {
        const mappedError = mapSdkApiError(error);

        if (mappedError !== null) {
          return reply.code(mappedError.statusCode).send(mappedError);
        }

        throw error;
      }
    },
  );

  app.patch(
    "/admin/role-bindings/:role_binding_id/status",
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
        const response = await dependencies.controlPlane.updateRoleBindingStatus({
          ...body,
          role_binding_id: params.role_binding_id,
        });

        return reply.code(200).send(response satisfies UpdateRoleBindingStatusResponse);
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
    "/admin/role-permissions",
    {
      schema: {
        body: attachRolePermissionBodySchema,
        response: attachRolePermissionResponseSchema,
      },
    },
    async (request, reply) => {
      try {
        const response = await dependencies.controlPlane.attachRolePermission(
          request.body as AttachRolePermissionRequest,
        );

        return reply.code(201).send(response satisfies AttachRolePermissionResponse);
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
    "/admin/deny-policies",
    {
      schema: {
        body: createDenyPolicyBodySchema,
        response: createDenyPolicyResponseSchema,
      },
    },
    async (request, reply) => {
      try {
        const response = await dependencies.controlPlane.createDenyPolicy(
          request.body as CreateDenyPolicyRequest,
        );

        return reply.code(201).send(response satisfies CreateDenyPolicyResponse);
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