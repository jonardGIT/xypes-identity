import assert from "node:assert/strict";
import test from "node:test";

import {
  XypesIdentityApiError,
  XypesIdentityOnboardingManifestError,
  applyOnboardingManifest,
  type XypesIdentityClient,
  type XypesIdentityOnboardingManifest,
} from "../src/index.js";

const manifest: XypesIdentityOnboardingManifest = {
  tenant_id: "tenant_123",
  identity_bridge_mapping: {
    supabase_project_ref: "billing-supabase-project",
    expected_jwt_issuer: "https://billing.supabase.co/auth/v1",
    expected_jwt_audience: "authenticated",
    tenant_resolution_rule: "route_segment",
    tenant_resolution_detail:
      "Resolve tenant_id from /tenants/tenant_123/... request routes.",
    tenant_membership_bootstrap:
      "Grant tenant membership manually before enabling enforcement.",
  },
  application: {
    application_id: "consumer_billing_app",
    slug: "billing",
    display_name: "Billing",
  },
  permissions: [
    {
      ref: "read",
      action: "read",
      resource_type: "billing.record",
      description: "Read Billing records",
    },
    {
      ref: "write",
      action: "write",
      resource_type: "billing.record",
      description: "Write Billing records",
    },
    {
      ref: "approve",
      action: "approve",
      resource_type: "billing.record",
      description: "Approve privileged Billing actions",
    },
  ],
  role_definitions: [
    {
      name: "billing-operator",
      description: "Operational access for Billing",
      approval_required: false,
      status: "active",
      permission_refs: ["read", "write"],
    },
    {
      name: "billing-approver",
      description: "Privileged approval access for Billing",
      approval_required: true,
      status: "active",
      permission_refs: ["read", "approve"],
    },
  ],
};

type ControlPlaneClient = XypesIdentityClient["controlPlane"];

const unexpectedCall = (methodName: string) => () => {
  throw new Error(`Unexpected call to ${methodName}`);
};

const createControlPlaneClient = (
  overrides: Partial<ControlPlaneClient>,
): ControlPlaneClient => ({
  createApplication: unexpectedCall("createApplication"),
  listApplications: unexpectedCall("listApplications"),
  createGroup: unexpectedCall("createGroup"),
  createGroupMembership: unexpectedCall("createGroupMembership"),
  createPermission: unexpectedCall("createPermission"),
  listPermissions: unexpectedCall("listPermissions"),
  createRoleDefinition: unexpectedCall("createRoleDefinition"),
  listRoleDefinitions: unexpectedCall("listRoleDefinitions"),
  updateRoleDefinitionStatus: unexpectedCall("updateRoleDefinitionStatus"),
  createRoleBinding: unexpectedCall("createRoleBinding"),
  updateRoleBindingStatus: unexpectedCall("updateRoleBindingStatus"),
  attachRolePermission: unexpectedCall("attachRolePermission"),
  createDenyPolicy: unexpectedCall("createDenyPolicy"),
  ...overrides,
}) as ControlPlaneClient;

test("applyOnboardingManifest creates missing control-plane state and activates new role definitions", async () => {
  const calls: string[] = [];
  const controlPlane = createControlPlaneClient({
    listApplications: async () => {
      calls.push("listApplications");
      return {
        generated_at: "2026-05-30T00:00:00.000Z",
        applications: [],
      };
    },
    createApplication: async (request) => {
      calls.push(`createApplication:${request.slug}`);
      return {
        application: {
          application_id: "app_123",
          tenant_id: request.tenant_id,
          slug: request.slug,
          display_name: request.display_name,
          status: "active",
          created_at: "2026-05-30T00:00:00.000Z",
          updated_at: "2026-05-30T00:00:00.000Z",
          created_by: request.actor_subject,
          updated_by: request.actor_subject,
        },
        audit: {
          audit_event_id: "audit_application_123",
        },
      };
    },
    listPermissions: async (request) => {
      calls.push(`listPermissions:${request.application_id}`);
      return {
        generated_at: "2026-05-30T00:00:00.000Z",
        permissions: [],
      };
    },
    createPermission: async (request) => {
      calls.push(`createPermission:${request.action}`);
      return {
        permission: {
          permission_id: `permission_${request.action}`,
          tenant_id: request.tenant_id,
          application_id: request.application_id,
          action: request.action,
          resource_type: request.resource_type,
          description: request.description,
          created_at: "2026-05-30T00:00:00.000Z",
          updated_at: "2026-05-30T00:00:00.000Z",
          created_by: request.actor_subject,
          updated_by: request.actor_subject,
        },
        audit: {
          audit_event_id: `audit_permission_${request.action}`,
        },
      };
    },
    listRoleDefinitions: async (request) => {
      calls.push(`listRoleDefinitions:${request.application_id}`);
      return {
        generated_at: "2026-05-30T00:00:00.000Z",
        role_definitions: [],
      };
    },
    createRoleDefinition: async (request) => {
      calls.push(`createRoleDefinition:${request.name}`);
      return {
        role_definition: {
          role_definition_id: `role_${request.name}`,
          tenant_id: request.tenant_id,
          application_id: request.application_id,
          name: request.name,
          description: request.description,
          status: "draft",
          approval_required: request.approval_required,
          created_at: "2026-05-30T00:00:00.000Z",
          updated_at: "2026-05-30T00:00:00.000Z",
          created_by: request.actor_subject,
          updated_by: request.actor_subject,
        },
        audit: {
          audit_event_id: `audit_role_${request.name}`,
        },
      };
    },
    updateRoleDefinitionStatus: async (request) => {
      calls.push(`updateRoleDefinitionStatus:${request.role_definition_id}:${request.status}`);
      return {
        role_definition: {
          role_definition_id: request.role_definition_id,
          tenant_id: request.tenant_id,
          application_id: "app_123",
          name: request.role_definition_id.replace("role_", ""),
          description: null,
          status: request.status,
          approval_required: request.role_definition_id.includes("approver"),
          created_at: "2026-05-30T00:00:00.000Z",
          updated_at: "2026-05-30T00:01:00.000Z",
          created_by: request.actor_subject,
          updated_by: request.actor_subject,
        },
        audit: {
          audit_event_id: `audit_status_${request.role_definition_id}`,
        },
      };
    },
    attachRolePermission: async (request) => {
      calls.push(`attachRolePermission:${request.role_definition_id}:${request.permission_id}`);
      return {
        role_permission: {
          role_permission_id: `${request.role_definition_id}:${request.permission_id}`,
          tenant_id: request.tenant_id,
          role_definition_id: request.role_definition_id,
          permission_id: request.permission_id,
          created_at: "2026-05-30T00:00:00.000Z",
          updated_at: "2026-05-30T00:00:00.000Z",
          created_by: request.actor_subject,
          updated_by: request.actor_subject,
        },
        audit: {
          audit_event_id: `audit_attach_${request.role_definition_id}_${request.permission_id}`,
        },
      };
    },
  });

  const result = await applyOnboardingManifest({
    client: { controlPlane },
    manifest,
    actor_subject: "operator@example.com",
    actor_principal_id: "principal_operator_123",
  });

  assert.equal(result.application.action, "created");
  assert.equal(result.permissions.filter((entry) => entry.action === "created").length, 3);
  assert.equal(result.role_definitions.filter((entry) => entry.action === "created").length, 2);
  assert.equal(result.role_definitions.filter((entry) => entry.status_action === "updated").length, 2);
  assert.equal(result.role_permissions.filter((entry) => entry.action === "attached").length, 4);
  assert.equal(result.warnings.length, 1);
  assert.deepEqual(calls, [
    "listApplications",
    "createApplication:billing",
    "listPermissions:app_123",
    "createPermission:read",
    "createPermission:write",
    "createPermission:approve",
    "listRoleDefinitions:app_123",
    "createRoleDefinition:billing-operator",
    "updateRoleDefinitionStatus:role_billing-operator:active",
    "createRoleDefinition:billing-approver",
    "updateRoleDefinitionStatus:role_billing-approver:active",
    "attachRolePermission:role_billing-operator:permission_read",
    "attachRolePermission:role_billing-operator:permission_write",
    "attachRolePermission:role_billing-approver:permission_read",
    "attachRolePermission:role_billing-approver:permission_approve",
  ]);
});

test("applyOnboardingManifest supports dry-run planning without mutations", async () => {
  let mutationCallCount = 0;
  const controlPlane = createControlPlaneClient({
    listApplications: async () => ({
      generated_at: "2026-05-30T00:00:00.000Z",
      applications: [],
    }),
    createApplication: async () => {
      mutationCallCount += 1;
      throw new Error("dry-run should not create applications");
    },
    createPermission: async () => {
      mutationCallCount += 1;
      throw new Error("dry-run should not create permissions");
    },
    createRoleDefinition: async () => {
      mutationCallCount += 1;
      throw new Error("dry-run should not create role definitions");
    },
    updateRoleDefinitionStatus: async () => {
      mutationCallCount += 1;
      throw new Error("dry-run should not update role definition status");
    },
    attachRolePermission: async () => {
      mutationCallCount += 1;
      throw new Error("dry-run should not attach permissions");
    },
  });

  const result = await applyOnboardingManifest({
    client: { controlPlane },
    manifest,
    actor_subject: "operator@example.com",
    dry_run: true,
  });

  assert.equal(result.dry_run, true);
  assert.equal(result.application.action, "planned");
  assert.equal(result.permissions.every((entry) => entry.action === "planned"), true);
  assert.equal(result.role_definitions.every((entry) => entry.action === "planned"), true);
  assert.equal(result.role_permissions.every((entry) => entry.action === "planned"), true);
  assert.equal(mutationCallCount, 0);
});

test("applyOnboardingManifest reuses existing state and treats duplicate role-permission attachments as already present", async () => {
  const controlPlane = createControlPlaneClient({
    listApplications: async () => ({
      generated_at: "2026-05-30T00:00:00.000Z",
      applications: [
        {
          application_id: "app_123",
          tenant_id: manifest.tenant_id,
          slug: manifest.application.slug,
          display_name: manifest.application.display_name,
          status: "active",
          created_at: "2026-05-30T00:00:00.000Z",
          updated_at: "2026-05-30T00:00:00.000Z",
          created_by: "operator@example.com",
          updated_by: "operator@example.com",
        },
      ],
    }),
    listPermissions: async () => ({
      generated_at: "2026-05-30T00:00:00.000Z",
      permissions: manifest.permissions.map((permission) => ({
        permission_id: `permission_${permission.action}`,
        tenant_id: manifest.tenant_id,
        application_id: "app_123",
        action: permission.action,
        resource_type: permission.resource_type,
        description: permission.description,
        created_at: "2026-05-30T00:00:00.000Z",
        updated_at: "2026-05-30T00:00:00.000Z",
        created_by: "operator@example.com",
        updated_by: "operator@example.com",
      })),
    }),
    listRoleDefinitions: async () => ({
      generated_at: "2026-05-30T00:00:00.000Z",
      role_definitions: manifest.role_definitions.map((roleDefinition) => ({
        role_definition_id: `role_${roleDefinition.name}`,
        tenant_id: manifest.tenant_id,
        application_id: "app_123",
        name: roleDefinition.name,
        description: roleDefinition.description,
        status: "draft",
        approval_required: roleDefinition.approval_required,
        created_at: "2026-05-30T00:00:00.000Z",
        updated_at: "2026-05-30T00:00:00.000Z",
        created_by: "operator@example.com",
        updated_by: "operator@example.com",
      })),
    }),
    updateRoleDefinitionStatus: async (request) => ({
      role_definition: {
        role_definition_id: request.role_definition_id,
        tenant_id: request.tenant_id,
        application_id: "app_123",
        name: request.role_definition_id.replace("role_", ""),
        description: request.role_definition_id.includes("approver")
          ? "Privileged approval access for Billing"
          : "Operational access for Billing",
        status: request.status,
        approval_required: request.role_definition_id.includes("approver"),
        created_at: "2026-05-30T00:00:00.000Z",
        updated_at: "2026-05-30T00:01:00.000Z",
        created_by: request.actor_subject,
        updated_by: request.actor_subject,
      },
      audit: {
        audit_event_id: `audit_status_${request.role_definition_id}`,
      },
    }),
    attachRolePermission: async () => {
      throw new XypesIdentityApiError({
        error: "Role Permission Error",
        message: "Role permission already exists.",
        statusCode: 409,
        code: "ROLE_PERMISSION_DUPLICATE",
      });
    },
  });

  const result = await applyOnboardingManifest({
    client: { controlPlane },
    manifest,
    actor_subject: "operator@example.com",
  });

  assert.equal(result.application.action, "existing");
  assert.equal(result.permissions.every((entry) => entry.action === "existing"), true);
  assert.equal(result.role_definitions.every((entry) => entry.action === "existing"), true);
  assert.equal(result.role_definitions.every((entry) => entry.status_action === "updated"), true);
  assert.equal(result.role_permissions.every((entry) => entry.action === "existing"), true);
});

test("applyOnboardingManifest rejects incompatible immutable state", async () => {
  const controlPlane = createControlPlaneClient({
    listApplications: async () => ({
      generated_at: "2026-05-30T00:00:00.000Z",
      applications: [
        {
          application_id: "app_123",
          tenant_id: manifest.tenant_id,
          slug: manifest.application.slug,
          display_name: manifest.application.display_name,
          status: "active",
          created_at: "2026-05-30T00:00:00.000Z",
          updated_at: "2026-05-30T00:00:00.000Z",
          created_by: "operator@example.com",
          updated_by: "operator@example.com",
        },
      ],
    }),
    listPermissions: async () => ({
      generated_at: "2026-05-30T00:00:00.000Z",
      permissions: [
        {
          permission_id: "permission_read",
          tenant_id: manifest.tenant_id,
          application_id: "app_123",
          action: "read",
          resource_type: "billing.record",
          description: "Legacy description",
          created_at: "2026-05-30T00:00:00.000Z",
          updated_at: "2026-05-30T00:00:00.000Z",
          created_by: "operator@example.com",
          updated_by: "operator@example.com",
        },
      ],
    }),
  });

  await assert.rejects(
    () =>
      applyOnboardingManifest({
        client: { controlPlane },
        manifest: {
          ...manifest,
          permissions: [manifest.permissions[0]!],
          role_definitions: [],
        },
        actor_subject: "operator@example.com",
      }),
    (error: unknown) => {
      assert.ok(error instanceof XypesIdentityOnboardingManifestError);
      assert.match(error.message, /Existing permission state is incompatible/);
      assert.match(error.issues[0] ?? "", /Legacy description/);
      return true;
    },
  );
});