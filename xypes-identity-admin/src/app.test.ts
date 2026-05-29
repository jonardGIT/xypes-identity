import assert from "node:assert/strict";
import test from "node:test";

import {
  type AttachRolePermissionRequest,
  type AttachRolePermissionResponse,
  type CreateApplicationRequest,
  type CreateApplicationResponse,
  type CreateDenyPolicyRequest,
  type CreateDenyPolicyResponse,
  type CreateGroupMembershipRequest,
  type CreateGroupMembershipResponse,
  type CreateGroupRequest,
  type CreateGroupResponse,
  type CreatePermissionRequest,
  type CreatePermissionResponse,
  XypesIdentityApiError,
  type CreateRoleBindingRequest,
  type CreateRoleBindingResponse,
  type CreateRoleDefinitionRequest,
  type CreateRoleDefinitionResponse,
  type ListAuditEventsRequest,
  type ListAuditEventsResponse,
  type ListAccessReviewFindingsRequest,
  type ListAccessReviewFindingsResponse,
  type UpdateRoleBindingStatusRequest,
  type UpdateRoleBindingStatusResponse,
  type UpdateRoleDefinitionStatusRequest,
  type UpdateRoleDefinitionStatusResponse,
} from "@xypes-identity/sdk";

import {
  buildApp,
  type AdminAccessReviewClient,
  type AdminAuditClient,
  type AdminControlPlaneClient,
  type AdminOperationsClient,
} from "./app.js";

const createUnexpectedMethod = (methodName: string) => async (): Promise<never> => {
  throw new Error(`Unexpected ${methodName} call`);
};

const createControlPlaneStub = (
  overrides: Partial<AdminControlPlaneClient> = {},
): AdminControlPlaneClient => ({
  createApplication: createUnexpectedMethod("createApplication"),
  createGroup: createUnexpectedMethod("createGroup"),
  createGroupMembership: createUnexpectedMethod("createGroupMembership"),
  createPermission: createUnexpectedMethod("createPermission"),
  createRoleDefinition: createUnexpectedMethod("createRoleDefinition"),
  updateRoleDefinitionStatus: createUnexpectedMethod("updateRoleDefinitionStatus"),
  createRoleBinding: createUnexpectedMethod("createRoleBinding"),
  updateRoleBindingStatus: createUnexpectedMethod("updateRoleBindingStatus"),
  attachRolePermission: createUnexpectedMethod("attachRolePermission"),
  createDenyPolicy: createUnexpectedMethod("createDenyPolicy"),
  ...overrides,
});

const createAccessReviewStub = (
  overrides: Partial<AdminAccessReviewClient> = {},
): AdminAccessReviewClient => ({
  listFindings: createUnexpectedMethod("listFindings"),
  ...overrides,
});

const createAuditStub = (
  overrides: Partial<AdminAuditClient> = {},
): AdminAuditClient => ({
  listEvents: createUnexpectedMethod("listEvents"),
  ...overrides,
});

const createOperationsStub = (
  overrides: Partial<AdminOperationsClient> = {},
): AdminOperationsClient => ({
  getTelemetry: createUnexpectedMethod("getTelemetry"),
  ...overrides,
});

const createRoleDefinitionRequest: CreateRoleDefinitionRequest = {
  tenant_id: "tenant_123",
  application_id: "app_123",
  name: "billing-admin",
  description: "Billing administration",
  approval_required: true,
  actor_principal_id: "principal_123",
  actor_subject: "admin@example.com",
  reason: "Create initial admin role",
};

const createRoleDefinitionResponse: CreateRoleDefinitionResponse = {
  role_definition: {
    role_definition_id: "role_123",
    tenant_id: "tenant_123",
    application_id: "app_123",
    name: "billing-admin",
    description: "Billing administration",
    status: "draft",
    approval_required: true,
    created_at: "2026-05-28T10:00:00.000Z",
    updated_at: "2026-05-28T10:00:00.000Z",
    created_by: "admin@example.com",
    updated_by: "admin@example.com",
  },
  audit: {
    audit_event_id: "audit_123",
  },
};

const updateRoleDefinitionStatusResponse: UpdateRoleDefinitionStatusResponse = {
  role_definition: {
    ...createRoleDefinitionResponse.role_definition,
    status: "active",
    updated_at: "2026-05-28T10:05:00.000Z",
  },
  audit: {
    audit_event_id: "audit_456",
  },
};

const createApplicationRequest: CreateApplicationRequest = {
  tenant_id: "tenant_123",
  slug: "billing",
  display_name: "Billing",
  actor_principal_id: "principal_123",
  actor_subject: "admin@example.com",
  reason: "Create billing application",
};

const createApplicationResponse: CreateApplicationResponse = {
  application: {
    application_id: "application_123",
    tenant_id: "tenant_123",
    slug: "billing",
    display_name: "Billing",
    status: "active",
    created_at: "2026-05-28T10:00:00.000Z",
    updated_at: "2026-05-28T10:00:00.000Z",
    created_by: "admin@example.com",
    updated_by: "admin@example.com",
  },
  audit: {
    audit_event_id: "audit_application_123",
  },
};

const createGroupRequest: CreateGroupRequest = {
  tenant_id: "tenant_123",
  scope_application_id: "application_123",
  name: "billing-operators",
  description: "Billing operators",
  group_type: "manual",
  owner_principal_id: "principal_owner_123",
  scope_type: "application",
  scope_resource_type: null,
  scope_resource_id: null,
  actor_principal_id: "principal_123",
  actor_subject: "admin@example.com",
  reason: "Create operator group",
};

const createGroupResponse: CreateGroupResponse = {
  group: {
    group_id: "group_123",
    tenant_id: "tenant_123",
    scope_application_id: "application_123",
    name: "billing-operators",
    description: "Billing operators",
    group_type: "manual",
    owner_principal_id: "principal_owner_123",
    scope_type: "application",
    scope_resource_type: null,
    scope_resource_id: null,
    created_at: "2026-05-28T10:00:00.000Z",
    updated_at: "2026-05-28T10:00:00.000Z",
    created_by: "admin@example.com",
    updated_by: "admin@example.com",
  },
  audit: {
    audit_event_id: "audit_group_123",
  },
};

const createGroupMembershipRequest: CreateGroupMembershipRequest = {
  tenant_id: "tenant_123",
  group_id: "group_123",
  member_principal_id: "principal_member_123",
  member_group_id: null,
  membership_source: "manual",
  actor_principal_id: "principal_123",
  actor_subject: "admin@example.com",
  reason: "Add operator to group",
};

const createGroupMembershipResponse: CreateGroupMembershipResponse = {
  group_membership: {
    group_membership_id: "membership_123",
    tenant_id: "tenant_123",
    group_id: "group_123",
    member_principal_id: "principal_member_123",
    member_group_id: null,
    membership_source: "manual",
    created_at: "2026-05-28T10:00:00.000Z",
    updated_at: "2026-05-28T10:00:00.000Z",
    created_by: "admin@example.com",
    updated_by: "admin@example.com",
  },
  audit: {
    audit_event_id: "audit_group_membership_123",
  },
};

const createPermissionRequest: CreatePermissionRequest = {
  tenant_id: "tenant_123",
  application_id: "application_123",
  action: "read",
  resource_type: "invoice",
  description: "Read invoices",
  actor_principal_id: "principal_123",
  actor_subject: "admin@example.com",
  reason: "Create billing read permission",
};

const createPermissionResponse: CreatePermissionResponse = {
  permission: {
    permission_id: "permission_123",
    tenant_id: "tenant_123",
    application_id: "application_123",
    action: "read",
    resource_type: "invoice",
    description: "Read invoices",
    created_at: "2026-05-28T10:00:00.000Z",
    updated_at: "2026-05-28T10:00:00.000Z",
    created_by: "admin@example.com",
    updated_by: "admin@example.com",
  },
  audit: {
    audit_event_id: "audit_permission_123",
  },
};

const createRoleBindingRequest: CreateRoleBindingRequest = {
  tenant_id: "tenant_123",
  role_definition_id: "role_123",
  subject_principal_id: "principal_member_123",
  subject_group_id: null,
  scope_type: "application",
  scope_application_id: "application_123",
  scope_resource_type: null,
  scope_resource_id: null,
  actor_principal_id: "principal_123",
  actor_subject: "admin@example.com",
  reason: "Assign role to operator",
};

const createRoleBindingResponse: CreateRoleBindingResponse = {
  role_binding: {
    role_binding_id: "role_binding_123",
    tenant_id: "tenant_123",
    role_definition_id: "role_123",
    role_binding_status: "eligible",
    subject_principal_id: "principal_member_123",
    subject_group_id: null,
    scope_type: "application",
    scope_application_id: "application_123",
    scope_resource_type: null,
    scope_resource_id: null,
    created_at: "2026-05-28T10:00:00.000Z",
    updated_at: "2026-05-28T10:00:00.000Z",
    created_by: "admin@example.com",
    updated_by: "admin@example.com",
  },
  audit: {
    audit_event_id: "audit_role_binding_123",
  },
};

const updateRoleBindingStatusResponse: UpdateRoleBindingStatusResponse = {
  role_binding: {
    ...createRoleBindingResponse.role_binding,
    role_binding_status: "active",
    updated_at: "2026-05-28T10:05:00.000Z",
    updated_by: "approver@example.com",
  },
  audit: {
    audit_event_id: "audit_role_binding_456",
  },
};

const attachRolePermissionRequest: AttachRolePermissionRequest = {
  tenant_id: "tenant_123",
  role_definition_id: "role_123",
  permission_id: "permission_123",
  actor_principal_id: "principal_123",
  actor_subject: "admin@example.com",
  reason: "Attach permission to role",
};

const attachRolePermissionResponse: AttachRolePermissionResponse = {
  role_permission: {
    role_permission_id: "role_permission_123",
    tenant_id: "tenant_123",
    role_definition_id: "role_123",
    permission_id: "permission_123",
    created_at: "2026-05-28T10:00:00.000Z",
    updated_at: "2026-05-28T10:00:00.000Z",
    created_by: "admin@example.com",
    updated_by: "admin@example.com",
  },
  audit: {
    audit_event_id: "audit_role_permission_123",
  },
};

const createDenyPolicyRequest: CreateDenyPolicyRequest = {
  tenant_id: "tenant_123",
  permission_id: "permission_123",
  subject_principal_id: null,
  subject_group_id: "group_123",
  scope_type: "application",
  scope_application_id: "application_123",
  scope_resource_type: null,
  scope_resource_id: null,
  reason: "Temporary suspension",
  actor_principal_id: "principal_123",
  actor_subject: "admin@example.com",
  audit_reason: "Apply temporary deny during incident",
};

const createDenyPolicyResponse: CreateDenyPolicyResponse = {
  deny_policy: {
    deny_policy_id: "deny_policy_123",
    tenant_id: "tenant_123",
    permission_id: "permission_123",
    subject_principal_id: null,
    subject_group_id: "group_123",
    scope_type: "application",
    scope_application_id: "application_123",
    scope_resource_type: null,
    scope_resource_id: null,
    reason: "Temporary suspension",
    created_at: "2026-05-28T10:00:00.000Z",
    updated_at: "2026-05-28T10:00:00.000Z",
    created_by: "admin@example.com",
    updated_by: "admin@example.com",
  },
  audit: {
    audit_event_id: "audit_deny_policy_123",
  },
};

const listAccessReviewFindingsRequest: ListAccessReviewFindingsRequest = {
  tenant_id: "tenant_123",
  stale_after_days: 30,
  finding_codes: ["STALE_ROLE_BINDING", "ORPHANED_GROUP_OWNER"],
  limit: 25,
};

const listAccessReviewFindingsResponse: ListAccessReviewFindingsResponse = {
  generated_at: "2026-05-28T10:15:00.000Z",
  stale_cutoff_at: "2026-04-28T10:15:00.000Z",
  findings: [
    {
      finding_id: "finding_123",
      code: "STALE_ROLE_BINDING",
      severity: "high",
      entity_type: "role_binding",
      entity_id: "binding_123",
      title: "Stale role binding",
      detail: "The role binding has not been reviewed within the configured window.",
      evidence_ids: ["binding_123", "role_123"],
      observed_at: "2026-05-28T10:14:00.000Z",
      scope_type: "application",
      scope_application_id: "application_123",
      scope_resource_type: null,
      scope_resource_id: null,
      owner_principal_id: null,
      subject_principal_id: "principal_member_123",
      subject_group_id: null,
      role_binding_status: "active",
      role_definition_id: "role_123",
      role_definition_name: "billing-admin",
      role_definition_status: "active",
      approval_required: true,
      permission_ids: ["permission_123"],
    },
  ],
};

const listAccessReviewWorkbenchResponse: ListAccessReviewFindingsResponse = {
  generated_at: "2026-05-28T10:15:00.000Z",
  stale_cutoff_at: "2026-04-28T10:15:00.000Z",
  findings: [
    {
      finding_id: "finding_privileged_123",
      code: "PRIVILEGED_ROLE_BINDING",
      severity: "high",
      entity_type: "role_binding",
      entity_id: "binding_eligible_123",
      title: "Privileged access requires approval activation",
      detail: "The binding remains eligible until an approver activates it.",
      evidence_ids: ["binding_eligible_123", "role_123", "permission_123"],
      observed_at: "2026-05-28T10:10:00.000Z",
      scope_type: "application",
      scope_application_id: "application_123",
      scope_resource_type: null,
      scope_resource_id: null,
      owner_principal_id: null,
      subject_principal_id: "principal_member_123",
      subject_group_id: null,
      role_binding_status: "eligible",
      role_definition_id: "role_123",
      role_definition_name: "billing-admin",
      role_definition_status: "active",
      approval_required: true,
      permission_ids: ["permission_123"],
    },
    {
      finding_id: "finding_stale_123",
      code: "STALE_ROLE_BINDING",
      severity: "high",
      entity_type: "role_binding",
      entity_id: "binding_active_123",
      title: "Stale role binding",
      detail: "The role binding has not been reviewed within the configured window.",
      evidence_ids: ["binding_active_123", "role_123"],
      observed_at: "2026-05-28T10:14:00.000Z",
      scope_type: "application",
      scope_application_id: "application_123",
      scope_resource_type: null,
      scope_resource_id: null,
      owner_principal_id: null,
      subject_principal_id: "principal_member_456",
      subject_group_id: null,
      role_binding_status: "active",
      role_definition_id: "role_123",
      role_definition_name: "billing-admin",
      role_definition_status: "active",
      approval_required: true,
      permission_ids: ["permission_123"],
    },
  ],
};

const listAuditEventsRequest: ListAuditEventsRequest = {
  tenant_id: "tenant_123",
  event_types: ["role_binding.status_updated"],
  entity_type: "role_binding",
  entity_id: "role_binding_123",
  limit: 25,
};

const listAuditEventsResponse: ListAuditEventsResponse = {
  generated_at: "2026-05-28T10:20:00.000Z",
  events: [
    {
      audit_event_id: "audit_role_binding_456",
      tenant_id: "tenant_123",
      event_type: "role_binding.status_updated",
      entity_type: "role_binding",
      entity_id: "role_binding_123",
      actor_principal_id: null,
      actor_subject: "approver@example.com",
      reason: "Approval completed",
      before_payload: { role_binding_status: "eligible" },
      after_payload: { role_binding_status: "active" },
      correlation_id: "role_binding_123",
      reference_type: "role_definition",
      reference_id: "role_123",
      occurred_at: "2026-05-28T10:05:00.000Z",
    },
    {
      audit_event_id: "audit_role_definition_789",
      tenant_id: "tenant_123",
      event_type: "role_definition.status_updated",
      entity_type: "role_definition",
      entity_id: "role_123",
      actor_principal_id: "principal_approver",
      actor_subject: "approver@example.com",
      reason: "Role promoted after review",
      before_payload: { status: "draft" },
      after_payload: { status: "active" },
      correlation_id: "role_123",
      reference_type: "application",
      reference_id: "application_123",
      occurred_at: "2026-05-28T10:10:00.000Z",
    },
  ],
};

const operationalTelemetryResponse = {
  generated_at: "2026-05-28T10:30:00.000Z",
  resolve_session: {
    total_requests: 12,
    success_count: 8,
    failure_count: 4,
    token_failure_count: 2,
    availability_failure_count: 1,
    tenant_access_failure_count: 1,
    average_duration_ms: 11,
    last_duration_ms: 15,
    last_error_code: "AUTH_JWKS_UNAVAILABLE",
    last_resolved_at: "2026-05-28T10:28:00.000Z",
    last_failed_at: "2026-05-28T10:29:00.000Z",
  },
  authorization: {
    authorize_check_total: 20,
    authorize_explain_total: 3,
    decision_cache_hit_count: 14,
    decision_cache_miss_count: 6,
    expansion_cache_hit_count: 2,
    expansion_cache_miss_count: 1,
    average_check_duration_ms: 9,
    average_explain_duration_ms: 17,
    last_check_duration_ms: 8,
    last_explain_duration_ms: 19,
    last_decision_at: "2026-05-28T10:29:30.000Z",
  },
  replay: {
    batches_processed_total: 5,
    batches_with_failures_total: 1,
    events_claimed_total: 32,
    events_published_total: 31,
    events_failed_total: 1,
    average_batch_duration_ms: 24,
    last_batch_duration_ms: 30,
    last_batch_completed_at: "2026-05-28T10:27:00.000Z",
  },
  identity_lifecycle: {
    status: "not_configured" as const,
    webhook_events_processed_total: 0,
    webhook_failures_total: 0,
    reconciliation_runs_total: 0,
    reconciliation_anomalies_total: 0,
    last_webhook_at: null,
    last_reconciliation_at: null,
    notes: "pending",
  },
  rollout_diagnostics: {
    bridge_failure_visibility_ready: true,
    decision_latency_visibility_ready: true,
    replay_visibility_ready: true,
    identity_lifecycle_visibility_ready: false,
  },
};

test("POST /admin/role-definitions delegates successful creation to the SDK client", async (t) => {
  let capturedRequest: CreateRoleDefinitionRequest | undefined;

  const app = await buildApp({
    audit: createAuditStub(),
    accessReviews: createAccessReviewStub(),
    logger: false,
    controlPlane: createControlPlaneStub({
      createRoleDefinition: async (request) => {
        capturedRequest = request;
        return createRoleDefinitionResponse;
      },
    }),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/admin/role-definitions",
    payload: createRoleDefinitionRequest,
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(capturedRequest, createRoleDefinitionRequest);
  assert.deepEqual(response.json(), createRoleDefinitionResponse);
});

test("PATCH /admin/role-definitions/:role_definition_id/status delegates with the path parameter", async (t) => {
  let capturedRequest: UpdateRoleDefinitionStatusRequest | undefined;

  const app = await buildApp({
    audit: createAuditStub(),
    accessReviews: createAccessReviewStub(),
    logger: false,
    controlPlane: createControlPlaneStub({
      updateRoleDefinitionStatus: async (request) => {
        capturedRequest = request;
        return updateRoleDefinitionStatusResponse;
      },
    }),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/admin/role-definitions/role_123/status",
    payload: {
      tenant_id: "tenant_123",
      status: "active",
      actor_principal_id: "principal_123",
      actor_subject: "admin@example.com",
      reason: "Approval completed",
    } satisfies Omit<UpdateRoleDefinitionStatusRequest, "role_definition_id">,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(capturedRequest, {
    tenant_id: "tenant_123",
    role_definition_id: "role_123",
    status: "active",
    actor_principal_id: "principal_123",
    actor_subject: "admin@example.com",
    reason: "Approval completed",
  });
  assert.deepEqual(response.json(), updateRoleDefinitionStatusResponse);
});

test("PATCH /admin/role-bindings/:role_binding_id/status delegates with the path parameter", async (t) => {
  let capturedRequest: UpdateRoleBindingStatusRequest | undefined;

  const app = await buildApp({
    audit: createAuditStub(),
    accessReviews: createAccessReviewStub(),
    logger: false,
    controlPlane: createControlPlaneStub({
      updateRoleBindingStatus: async (request) => {
        capturedRequest = request;
        return updateRoleBindingStatusResponse;
      },
    }),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/admin/role-bindings/role_binding_123/status",
    payload: {
      tenant_id: "tenant_123",
      role_binding_status: "active",
      actor_principal_id: "principal_approver",
      actor_subject: "approver@example.com",
      reason: "Approval completed",
    } satisfies Omit<UpdateRoleBindingStatusRequest, "role_binding_id">,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(capturedRequest, {
    tenant_id: "tenant_123",
    role_binding_id: "role_binding_123",
    role_binding_status: "active",
    actor_principal_id: "principal_approver",
    actor_subject: "approver@example.com",
    reason: "Approval completed",
  });
  assert.deepEqual(response.json(), updateRoleBindingStatusResponse);
});

test("POST /admin/access-reviews/findings delegates successful queries to the SDK client", async (t) => {
  let capturedRequest: ListAccessReviewFindingsRequest | undefined;

  const app = await buildApp({
    audit: createAuditStub(),
    accessReviews: createAccessReviewStub({
      listFindings: async (request) => {
        capturedRequest = request;
        return listAccessReviewFindingsResponse;
      },
    }),
    logger: false,
    controlPlane: createControlPlaneStub(),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/admin/access-reviews/findings",
    payload: listAccessReviewFindingsRequest,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(capturedRequest, listAccessReviewFindingsRequest);
  assert.deepEqual(response.json(), listAccessReviewFindingsResponse);
});

test("POST /admin/access-reviews/findings returns deterministic SDK API errors", async (t) => {
  const app = await buildApp({
    audit: createAuditStub(),
    accessReviews: createAccessReviewStub({
      listFindings: async () => {
        throw new XypesIdentityApiError({
          error: "List Access Review Findings Error",
          message: "Tenant was not found",
          statusCode: 404,
          code: "TENANT_NOT_FOUND",
        });
      },
    }),
    logger: false,
    controlPlane: createControlPlaneStub(),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/admin/access-reviews/findings",
    payload: listAccessReviewFindingsRequest,
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), {
    error: "List Access Review Findings Error",
    message: "Tenant was not found",
    statusCode: 404,
    code: "TENANT_NOT_FOUND",
  });
});

test("GET /admin/access-reviews/console serves the admin governance console shell", async (t) => {
  const app = await buildApp({
    audit: createAuditStub(),
    accessReviews: createAccessReviewStub(),
    logger: false,
    controlPlane: createControlPlaneStub(),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/admin/access-reviews/console",
  });

  assert.equal(response.statusCode, 200);
  assert.match(response.headers["content-type"] ?? "", /^text\/html/);
  assert.match(response.body, /Governance review console/);
  assert.match(response.body, /\/admin\/access-reviews\/workbench/);
  assert.match(response.body, /\/admin\/role-bindings\//);
});

test("POST /admin/access-reviews/workbench shapes access review findings for admin UI consumption", async (t) => {
  const app = await buildApp({
    audit: createAuditStub(),
    accessReviews: createAccessReviewStub({
      listFindings: async () => listAccessReviewWorkbenchResponse,
    }),
    logger: false,
    controlPlane: createControlPlaneStub(),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/admin/access-reviews/workbench",
    payload: listAccessReviewFindingsRequest,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    generated_at: "2026-05-28T10:15:00.000Z",
    stale_cutoff_at: "2026-04-28T10:15:00.000Z",
    summary: {
      total_findings: 2,
      high_severity_count: 2,
      medium_severity_count: 0,
      approval_required_findings: 2,
      approval_activation_candidates: 1,
      counts_by_code: [
        { code: "PRIVILEGED_ROLE_BINDING", total: 1 },
        { code: "STALE_ROLE_BINDING", total: 1 },
        { code: "STALE_GROUP", total: 0 },
        { code: "ORPHANED_GROUP_OWNER", total: 0 },
      ],
    },
    approval_activation_candidates: [
      {
        finding_id: "finding_privileged_123",
        entity_id: "binding_eligible_123",
        title: "Privileged access requires approval activation",
        detail: "The binding remains eligible until an approver activates it.",
        observed_at: "2026-05-28T10:10:00.000Z",
        role_definition_id: "role_123",
        role_definition_name: "billing-admin",
        subject_principal_id: "principal_member_123",
        subject_group_id: null,
        scope_type: "application",
        scope_application_id: "application_123",
        scope_resource_type: null,
        scope_resource_id: null,
        permission_ids: ["permission_123"],
      },
    ],
    sections: [
      {
        code: "PRIVILEGED_ROLE_BINDING",
        title: "Approval Queue",
        total_findings: 1,
        findings: [listAccessReviewWorkbenchResponse.findings[0]],
      },
      {
        code: "STALE_ROLE_BINDING",
        title: "Stale Role Bindings",
        total_findings: 1,
        findings: [listAccessReviewWorkbenchResponse.findings[1]],
      },
      {
        code: "STALE_GROUP",
        title: "Stale Groups",
        total_findings: 0,
        findings: [],
      },
      {
        code: "ORPHANED_GROUP_OWNER",
        title: "Orphaned Group Owners",
        total_findings: 0,
        findings: [],
      },
    ],
  });
});

test("POST /admin/audit-events/workbench shapes audit events for admin visibility", async (t) => {
  const app = await buildApp({
    audit: createAuditStub({
      listEvents: async () => listAuditEventsResponse,
    }),
    accessReviews: createAccessReviewStub(),
    logger: false,
    controlPlane: createControlPlaneStub(),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/admin/audit-events/workbench",
    payload: listAuditEventsRequest,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    generated_at: "2026-05-28T10:20:00.000Z",
    summary: {
      total_events: 2,
      distinct_actor_subjects: 1,
      distinct_entity_types: 2,
      status_update_events: 2,
      counts_by_event_type: [
        { event_type: "role_binding.status_updated", total: 1 },
        { event_type: "role_definition.status_updated", total: 1 },
      ],
    },
    sections: [
      {
        entity_type: "role_binding",
        total_events: 1,
        last_occurred_at: "2026-05-28T10:05:00.000Z",
        events: [listAuditEventsResponse.events[0]],
      },
      {
        entity_type: "role_definition",
        total_events: 1,
        last_occurred_at: "2026-05-28T10:10:00.000Z",
        events: [listAuditEventsResponse.events[1]],
      },
    ],
  });
});

test("GET /admin/operations/diagnostics reshapes engine telemetry for operator visibility", async (t) => {
  const app = await buildApp({
    audit: createAuditStub(),
    accessReviews: createAccessReviewStub(),
    operations: createOperationsStub({
      getTelemetry: async () => operationalTelemetryResponse,
    }),
    logger: false,
    controlPlane: createControlPlaneStub(),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/admin/operations/diagnostics",
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    generated_at: "2026-05-28T10:30:00.000Z",
    summary: {
      token_validation_failures: 2,
      identity_availability_failures: 1,
      tenant_access_failures: 1,
      average_authorize_check_duration_ms: 9,
      average_authorize_explain_duration_ms: 17,
      replay_batches_with_failures_total: 1,
      identity_lifecycle_status: "not_configured",
    },
    sections: [
      {
        key: "token_validation_failures",
        title: "Token Validation Failures",
        items: [
          { label: "invalid_or_expired_tokens", value: 2, status: "warning" },
          { label: "jwks_or_verification_failures", value: 1, status: "attention" },
          { label: "tenant_access_failures", value: 1, status: "warning" },
          { label: "last_error_code", value: "AUTH_JWKS_UNAVAILABLE", status: "warning" },
        ],
      },
      {
        key: "authorization_latency",
        title: "Authorization Latency",
        items: [
          { label: "average_authorize_check_duration_ms", value: 9, status: "healthy" },
          { label: "average_authorize_explain_duration_ms", value: 17, status: "healthy" },
          { label: "decision_cache_hit_count", value: 14, status: "healthy" },
          { label: "expansion_cache_hit_count", value: 2, status: "healthy" },
        ],
      },
      {
        key: "rollout_diagnostics",
        title: "Rollout Diagnostics",
        items: [
          { label: "bridge_failure_visibility_ready", value: true, status: "healthy" },
          { label: "decision_latency_visibility_ready", value: true, status: "healthy" },
          { label: "replay_visibility_ready", value: true, status: "healthy" },
          { label: "identity_lifecycle_visibility_ready", value: false, status: "inactive" },
        ],
      },
    ],
  });
});

test("SDK API errors are returned as deterministic admin error responses", async (t) => {
  const app = await buildApp({
    audit: createAuditStub(),
    accessReviews: createAccessReviewStub(),
    logger: false,
    controlPlane: createControlPlaneStub({
      createRoleDefinition: async () => {
        throw new XypesIdentityApiError({
          error: "Create Role Definition Error",
          message: "Role name already exists for application",
          statusCode: 409,
          code: "ROLE_DEFINITION_DUPLICATE_NAME",
        });
      },
    }),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/admin/role-definitions",
    payload: createRoleDefinitionRequest,
  });

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.json(), {
    error: "Create Role Definition Error",
    message: "Role name already exists for application",
    statusCode: 409,
    code: "ROLE_DEFINITION_DUPLICATE_NAME",
  });
});

const createRouteTestCases = [
  {
    name: "POST /admin/applications delegates successful creation to the SDK client",
    methodName: "createApplication",
    url: "/admin/applications",
    payload: createApplicationRequest,
    responseBody: createApplicationResponse,
  },
  {
    name: "POST /admin/groups delegates successful creation to the SDK client",
    methodName: "createGroup",
    url: "/admin/groups",
    payload: createGroupRequest,
    responseBody: createGroupResponse,
  },
  {
    name: "POST /admin/group-memberships delegates successful creation to the SDK client",
    methodName: "createGroupMembership",
    url: "/admin/group-memberships",
    payload: createGroupMembershipRequest,
    responseBody: createGroupMembershipResponse,
  },
  {
    name: "POST /admin/permissions delegates successful creation to the SDK client",
    methodName: "createPermission",
    url: "/admin/permissions",
    payload: createPermissionRequest,
    responseBody: createPermissionResponse,
  },
  {
    name: "POST /admin/role-bindings delegates successful creation to the SDK client",
    methodName: "createRoleBinding",
    url: "/admin/role-bindings",
    payload: createRoleBindingRequest,
    responseBody: createRoleBindingResponse,
  },
  {
    name: "POST /admin/role-permissions delegates successful creation to the SDK client",
    methodName: "attachRolePermission",
    url: "/admin/role-permissions",
    payload: attachRolePermissionRequest,
    responseBody: attachRolePermissionResponse,
  },
  {
    name: "POST /admin/deny-policies delegates successful creation to the SDK client",
    methodName: "createDenyPolicy",
    url: "/admin/deny-policies",
    payload: createDenyPolicyRequest,
    responseBody: createDenyPolicyResponse,
  },
] as const satisfies ReadonlyArray<{
  name: string;
  methodName: keyof AdminControlPlaneClient;
  url: string;
  payload: unknown;
  responseBody: unknown;
}>;

for (const testCase of createRouteTestCases) {
  test(testCase.name, async (t) => {
    let capturedRequest: unknown;

    const app = await buildApp({
      audit: createAuditStub(),
      accessReviews: createAccessReviewStub(),
      logger: false,
      controlPlane: createControlPlaneStub({
        [testCase.methodName]: async (request: unknown) => {
          capturedRequest = request;
          return testCase.responseBody;
        },
      }),
    });

    t.after(async () => {
      await app.close();
    });

    const response = await app.inject({
      method: "POST",
      url: testCase.url,
      payload: testCase.payload,
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(capturedRequest, testCase.payload);
    assert.deepEqual(response.json(), testCase.responseBody);
  });
}

test("POST /admin/access-reviews/findings delegates successful listing to the SDK client", async (t) => {
  let capturedRequest: ListAccessReviewFindingsRequest | undefined;

  const app = await buildApp({
    audit: createAuditStub(),
    accessReviews: createAccessReviewStub({
      listFindings: async (request) => {
        capturedRequest = request;
        return listAccessReviewFindingsResponse;
      },
    }),
    logger: false,
    controlPlane: createControlPlaneStub(),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/admin/access-reviews/findings",
    payload: listAccessReviewFindingsRequest,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(capturedRequest, listAccessReviewFindingsRequest);
  assert.deepEqual(response.json(), listAccessReviewFindingsResponse);
});

test("POST /admin/audit-events/query delegates successful listing to the SDK client", async (t) => {
  let capturedRequest: ListAuditEventsRequest | undefined;

  const app = await buildApp({
    audit: createAuditStub({
      listEvents: async (request) => {
        capturedRequest = request;
        return listAuditEventsResponse;
      },
    }),
    accessReviews: createAccessReviewStub(),
    logger: false,
    controlPlane: createControlPlaneStub(),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/admin/audit-events/query",
    payload: listAuditEventsRequest,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(capturedRequest, listAuditEventsRequest);
  assert.deepEqual(response.json(), listAuditEventsResponse);
});

test("SDK API errors are passed through for POST /admin/access-reviews/findings", async (t) => {
  const app = await buildApp({
    audit: createAuditStub(),
    accessReviews: createAccessReviewStub({
      listFindings: async () => {
        throw new XypesIdentityApiError({
          error: "Access Review Findings Error",
          message: "Tenant access review configuration is invalid",
          statusCode: 400,
          code: "ACCESS_REVIEW_INVALID_REQUEST",
        });
      },
    }),
    logger: false,
    controlPlane: createControlPlaneStub(),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/admin/access-reviews/findings",
    payload: listAccessReviewFindingsRequest,
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), {
    error: "Access Review Findings Error",
    message: "Tenant access review configuration is invalid",
    statusCode: 400,
    code: "ACCESS_REVIEW_INVALID_REQUEST",
  });
});

test("SDK API errors are passed through for POST /admin/audit-events/query", async (t) => {
  const app = await buildApp({
    audit: createAuditStub({
      listEvents: async () => {
        throw new XypesIdentityApiError({
          error: "Audit Events Error",
          message: "Tenant id is required.",
          statusCode: 400,
          code: "HTTP_ERROR",
        });
      },
    }),
    accessReviews: createAccessReviewStub(),
    logger: false,
    controlPlane: createControlPlaneStub(),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/admin/audit-events/query",
    payload: listAuditEventsRequest,
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), {
    error: "Audit Events Error",
    message: "Tenant id is required.",
    statusCode: 400,
    code: "HTTP_ERROR",
  });
});

test("SDK API errors are passed through for POST /admin/applications", async (t) => {
  const app = await buildApp({
    audit: createAuditStub(),
    accessReviews: createAccessReviewStub(),
    logger: false,
    controlPlane: createControlPlaneStub({
      createApplication: async () => {
        throw new XypesIdentityApiError({
          error: "Create Application Error",
          message: "Application slug already exists for tenant",
          statusCode: 409,
          code: "APPLICATION_DUPLICATE_TENANT_SLUG",
        });
      },
    }),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/admin/applications",
    payload: createApplicationRequest,
  });

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.json(), {
    error: "Create Application Error",
    message: "Application slug already exists for tenant",
    statusCode: 409,
    code: "APPLICATION_DUPLICATE_TENANT_SLUG",
  });
});

test("SDK API errors are passed through for POST /admin/role-bindings toxic combination conflicts", async (t) => {
  const app = await buildApp({
    audit: createAuditStub(),
    accessReviews: createAccessReviewStub(),
    logger: false,
    controlPlane: createControlPlaneStub({
      createRoleBinding: async () => {
        throw new XypesIdentityApiError({
          error: "Create Role Binding Error",
          message:
            "The requested role binding is blocked by a toxic role combination with existing role binding binding-existing. Finance approvers cannot also request vendor payments.",
          statusCode: 409,
          code: "ROLE_BINDING_SOD_CONFLICT",
        });
      },
    }),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/admin/role-bindings",
    payload: createRoleBindingRequest,
  });

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.json(), {
    error: "Create Role Binding Error",
    message:
      "The requested role binding is blocked by a toxic role combination with existing role binding binding-existing. Finance approvers cannot also request vendor payments.",
    statusCode: 409,
    code: "ROLE_BINDING_SOD_CONFLICT",
  });
});

test("SDK API errors are passed through for PATCH /admin/role-bindings/:role_binding_id/status", async (t) => {
  const app = await buildApp({
    audit: createAuditStub(),
    accessReviews: createAccessReviewStub(),
    logger: false,
    controlPlane: createControlPlaneStub({
      updateRoleBindingStatus: async () => {
        throw new XypesIdentityApiError({
          error: "Update Role Binding Status Error",
          message: "The role binding does not exist for the supplied tenant.",
          statusCode: 404,
          code: "ROLE_BINDING_NOT_FOUND",
        });
      },
    }),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/admin/role-bindings/role_binding_missing/status",
    payload: {
      tenant_id: "tenant_123",
      role_binding_status: "active",
      actor_principal_id: null,
      actor_subject: "approver@example.com",
      reason: "Approval completed",
    },
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), {
    error: "Update Role Binding Status Error",
    message: "The role binding does not exist for the supplied tenant.",
    statusCode: 404,
    code: "ROLE_BINDING_NOT_FOUND",
  });
});