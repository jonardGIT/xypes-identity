import {
  applyOnboardingManifest,
  isXypesIdentityOnboardingManifestError,
  type ApplyOnboardingManifestResult,
  type XypesIdentityClient,
  type XypesIdentityOnboardingManifest,
} from "@xypes-identity/sdk";
import type { FastifyInstance } from "fastify";

import { mapSdkApiError } from "../error-mapping.js";
import { renderOnboardingConsole } from "../services/render-onboarding-console.js";

export type OnboardingControlPlaneClient = Pick<
  XypesIdentityClient["controlPlane"],
  | "attachRolePermission"
  | "createApplication"
  | "createPermission"
  | "createRoleDefinition"
  | "listApplications"
  | "listPermissions"
  | "listRoleDefinitions"
  | "updateRoleDefinitionStatus"
>;

export interface OnboardingRouteDependencies {
  controlPlane: OnboardingControlPlaneClient;
}

const tenantResolutionRuleSchema = {
  type: "string",
  enum: ["route_segment", "trusted_subdomain", "dedicated_internal_header"],
} as const;

const roleDefinitionStatusSchema = {
  type: "string",
  enum: ["draft", "active", "deprecated", "retired"],
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

const identityBridgeMappingSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "supabase_project_ref",
    "expected_jwt_issuer",
    "expected_jwt_audience",
    "tenant_resolution_rule",
    "tenant_resolution_detail",
    "tenant_membership_bootstrap",
  ],
  properties: {
    supabase_project_ref: { type: "string", minLength: 1 },
    expected_jwt_issuer: { type: "string", minLength: 1 },
    expected_jwt_audience: { type: "string", minLength: 1 },
    tenant_resolution_rule: tenantResolutionRuleSchema,
    tenant_resolution_detail: { type: "string", minLength: 1 },
    tenant_membership_bootstrap: { type: "string", minLength: 1 },
  },
} as const;

const manifestSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "tenant_id",
    "identity_bridge_mapping",
    "application",
    "permissions",
    "role_definitions",
  ],
  properties: {
    tenant_id: { type: "string", minLength: 1 },
    identity_bridge_mapping: identityBridgeMappingSchema,
    application: {
      type: "object",
      additionalProperties: false,
      required: ["application_id", "slug", "display_name"],
      properties: {
        application_id: { type: "string", minLength: 1 },
        slug: { type: "string", minLength: 1 },
        display_name: { type: "string", minLength: 1 },
      },
    },
    permissions: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ref", "action", "resource_type", "description"],
        properties: {
          ref: { type: "string", minLength: 1 },
          action: { type: "string", minLength: 1 },
          resource_type: { type: "string", minLength: 1 },
          description: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
      },
    },
    role_definitions: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "description",
          "approval_required",
          "status",
          "permission_refs",
        ],
        properties: {
          name: { type: "string", minLength: 1 },
          description: { anyOf: [{ type: "string" }, { type: "null" }] },
          approval_required: { type: "boolean" },
          status: roleDefinitionStatusSchema,
          permission_refs: {
            type: "array",
            minItems: 1,
            items: { type: "string", minLength: 1 },
            uniqueItems: true,
          },
        },
      },
    },
    validation_checklist: {
      anyOf: [
        {
          type: "array",
          items: { type: "string" },
        },
        { type: "null" },
      ],
    },
  },
} as const;

const onboardingRequestSchema = {
  type: "object",
  additionalProperties: false,
  required: ["manifest", "actor_subject"],
  properties: {
    manifest: manifestSchema,
    actor_subject: { type: "string", minLength: 1 },
    actor_principal_id: {
      anyOf: [{ type: "string", minLength: 1 }, { type: "null" }],
    },
    reason: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
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

const onboardingResponseSchema = {
  200: {
    type: "object",
    additionalProperties: false,
    required: [
      "dry_run",
      "identity_bridge_mapping",
      "application",
      "permissions",
      "role_definitions",
      "role_permissions",
      "warnings",
    ],
    properties: {
      dry_run: { type: "boolean" },
      identity_bridge_mapping: {
        type: "object",
        additionalProperties: false,
        required: ["automation_status", "captured", "manual_steps"],
        properties: {
          automation_status: { type: "string", enum: ["manual_capture_only"] },
          captured: identityBridgeMappingSchema,
          manual_steps: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      application: {
        type: "object",
        additionalProperties: false,
        required: ["action", "application", "manifest_application_id"],
        properties: {
          action: { type: "string", enum: ["existing", "created", "planned"] },
          application: { anyOf: [applicationSchema, { type: "null" }] },
          manifest_application_id: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
        },
      },
      permissions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["ref", "action", "permission"],
          properties: {
            ref: { type: "string" },
            action: {
              type: "string",
              enum: ["existing", "created", "planned"],
            },
            permission: { anyOf: [permissionSchema, { type: "null" }] },
          },
        },
      },
      role_definitions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "name",
            "action",
            "status_action",
            "desired_status",
            "role_definition",
            "audit_event_id",
          ],
          properties: {
            name: { type: "string" },
            action: {
              type: "string",
              enum: ["existing", "created", "planned"],
            },
            status_action: {
              type: "string",
              enum: ["unchanged", "updated", "planned"],
            },
            desired_status: roleDefinitionStatusSchema,
            role_definition: {
              anyOf: [roleDefinitionSchema, { type: "null" }],
            },
            audit_event_id: { anyOf: [{ type: "string" }, { type: "null" }] },
          },
        },
      },
      role_permissions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "role_definition_name",
            "permission_ref",
            "action",
            "audit_event_id",
          ],
          properties: {
            role_definition_name: { type: "string" },
            permission_ref: { type: "string" },
            action: {
              type: "string",
              enum: ["existing", "attached", "planned"],
            },
            audit_event_id: { anyOf: [{ type: "string" }, { type: "null" }] },
          },
        },
      },
      warnings: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
  "4xx": errorResponseSchema,
  "5xx": errorResponseSchema,
} as const;

const mapOnboardingError = (error: unknown) => {
  if (!isXypesIdentityOnboardingManifestError(error)) {
    return null;
  }

  return {
    error: "Onboarding Manifest Error",
    message: error.issues.join(" "),
    statusCode: 400,
    code: "ADMIN_ONBOARDING_MANIFEST_INVALID",
  };
};

const runOnboarding = async (
  manifest: XypesIdentityOnboardingManifest,
  actor_subject: string,
  actor_principal_id: string | null | undefined,
  reason: string | null | undefined,
  controlPlane: OnboardingControlPlaneClient,
  dry_run: boolean,
): Promise<ApplyOnboardingManifestResult> =>
  applyOnboardingManifest({
    client: { controlPlane },
    manifest,
    actor_subject,
    actor_principal_id: actor_principal_id ?? null,
    reason: reason ?? undefined,
    dry_run,
  });

export const registerOnboardingRoutes = async (
  app: FastifyInstance,
  dependencies: OnboardingRouteDependencies,
): Promise<void> => {
  app.get("/admin/onboarding/console", async (_request, reply) =>
    reply
      .code(200)
      .type("text/html; charset=utf-8")
      .send(renderOnboardingConsole()),
  );

  for (const [url, dry_run] of [
    ["/admin/onboarding/preview", true],
    ["/admin/onboarding/apply", false],
  ] as const) {
    app.post(
      url,
      {
        schema: {
          body: onboardingRequestSchema,
          response: onboardingResponseSchema,
        },
      },
      async (request, reply) => {
        try {
          const body = request.body as {
            manifest: XypesIdentityOnboardingManifest;
            actor_subject: string;
            actor_principal_id?: string | null;
            reason?: string | null;
          };

          const response = await runOnboarding(
            body.manifest,
            body.actor_subject,
            body.actor_principal_id,
            body.reason,
            dependencies.controlPlane,
            dry_run,
          );

          return reply
            .code(200)
            .send(response satisfies ApplyOnboardingManifestResult);
        } catch (error) {
          const onboardingError = mapOnboardingError(error);

          if (onboardingError !== null) {
            return reply.code(onboardingError.statusCode).send(onboardingError);
          }

          const mappedError = mapSdkApiError(error);

          if (mappedError !== null) {
            return reply.code(mappedError.statusCode).send(mappedError);
          }

          throw error;
        }
      },
    );
  }
};
