import assert from "node:assert/strict";
import test from "node:test";

import {
  XypesIdentityApiError,
  createXypesIdentityClient,
  isXypesIdentityResolveSessionAvailabilityError,
  isXypesIdentityResolveSessionAvailabilityErrorCode,
  type ListAuditEventsResponse,
  type ListAccessReviewFindingsResponse,
  type ListApplicationsResponse,
  type ListPermissionsResponse,
  type ListRoleDefinitionsResponse,
  type OperationalTelemetrySnapshot,
  type ResolveSessionResponse,
  type UpdateRoleBindingStatusResponse,
  type UpdateRoleDefinitionStatusResponse,
} from "../src/index.js";

const createJsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

test("auth.resolveSession maps a successful runtime response", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test",
    fetch: async (input, init) => {
      capturedUrl = input;
      capturedInit = init;

      const response: ResolveSessionResponse = {
        decision_id: "dec_123",
        principal: {
          principal_id: "principal_123",
          tenant_id: "tenant_123",
          subject: "user@example.com",
          email: "user@example.com",
          principal_status: "active",
          membership_status: "active",
        },
      };

      return createJsonResponse(response, 200);
    },
  });

  const result = await client.auth.resolveSession({
    token: "token_123",
    tenant_id: "tenant_123",
  });

  assert.equal(capturedUrl, "https://engine.example.test/v1/auth/resolve-session");
  assert.equal(capturedInit?.method, "POST");
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
    token: "token_123",
    tenant_id: "tenant_123",
  });
  assert.equal(result.decision_id, "dec_123");
  assert.equal(result.principal.tenant_id, "tenant_123");
});

test("auth.resolveSession preserves deterministic availability failures for callers", async () => {
  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test",
    fetch: async () =>
      createJsonResponse(
        {
          error: "Resolve Session Error",
          message: "Token verification is temporarily unavailable because the JWKS source could not be reached.",
          statusCode: 503,
          code: "AUTH_JWKS_UNAVAILABLE",
        },
        503,
      ),
  });

  await assert.rejects(
    () =>
      client.auth.resolveSession({
        token: "token_123",
        tenant_id: "tenant_123",
      }),
    (error: unknown) => {
      assert.ok(error instanceof XypesIdentityApiError);
      assert.equal(error.statusCode, 503);
      assert.equal(error.code, "AUTH_JWKS_UNAVAILABLE");
      assert.ok(isXypesIdentityResolveSessionAvailabilityError(error));
      assert.ok(isXypesIdentityResolveSessionAvailabilityErrorCode(error.code));
      return true;
    },
  );
});

test("accessReviews.listFindings posts the shared request shape with explicit tenant context", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test",
    fetch: async (input, init) => {
      capturedUrl = input;
      capturedInit = init;

      const response: ListAccessReviewFindingsResponse = {
        generated_at: "2026-05-28T12:00:00.000Z",
        stale_cutoff_at: "2026-04-28T12:00:00.000Z",
        findings: [
          {
            finding_id: "PRIVILEGED_ROLE_BINDING:binding_123",
            code: "PRIVILEGED_ROLE_BINDING",
            severity: "high",
            entity_type: "role_binding",
            entity_id: "binding_123",
            title: "Privileged access requires review",
            detail: "The binding grants privileged access and needs approval review.",
            evidence_ids: ["binding_123", "role_123", "permission_123"],
            observed_at: "2026-05-01T00:00:00.000Z",
            scope_type: "application",
            scope_application_id: "app_123",
            scope_resource_type: null,
            scope_resource_id: null,
            owner_principal_id: null,
            subject_principal_id: "principal_123",
            subject_group_id: null,
            role_binding_status: "eligible",
            role_definition_id: "role_123",
            role_definition_name: "Finance Approver",
            role_definition_status: "active",
            approval_required: true,
            permission_ids: ["permission_123"],
          },
        ],
      };

      return createJsonResponse(response, 200);
    },
  });

  const result = await client.accessReviews.listFindings({
    tenant_id: "tenant_123",
    stale_after_days: 30,
    finding_codes: ["PRIVILEGED_ROLE_BINDING"],
    limit: 10,
  });

  assert.equal(capturedUrl, "https://engine.example.test/v1/access-reviews/findings");
  assert.equal(capturedInit?.method, "POST");
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
    tenant_id: "tenant_123",
    stale_after_days: 30,
    finding_codes: ["PRIVILEGED_ROLE_BINDING"],
    limit: 10,
  });
  assert.equal(result.generated_at, "2026-05-28T12:00:00.000Z");
  assert.equal(result.findings[0]?.code, "PRIVILEGED_ROLE_BINDING");
  assert.equal(result.findings[0]?.subject_principal_id, "principal_123");
});

test("audit.listEvents posts the shared request shape with explicit tenant context", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test",
    fetch: async (input, init) => {
      capturedUrl = input;
      capturedInit = init;

      const response: ListAuditEventsResponse = {
        generated_at: "2026-05-28T12:05:00.000Z",
        events: [
          {
            audit_event_id: "audit_123",
            tenant_id: "tenant_123",
            event_type: "role_binding.status_updated",
            entity_type: "role_binding",
            entity_id: "binding_123",
            actor_principal_id: null,
            actor_subject: "approver@example.com",
            reason: "Approval completed",
            before_payload: { role_binding_status: "eligible" },
            after_payload: { role_binding_status: "active" },
            correlation_id: "binding_123",
            reference_type: "role_definition",
            reference_id: "role_123",
            occurred_at: "2026-05-28T12:00:00.000Z",
          },
        ],
      };

      return createJsonResponse(response, 200);
    },
  });

  const result = await client.audit.listEvents({
    tenant_id: "tenant_123",
    event_types: ["role_binding.status_updated"],
    entity_type: "role_binding",
    entity_id: "binding_123",
    limit: 10,
  });

  assert.equal(capturedUrl, "https://engine.example.test/v1/audit-events/query");
  assert.equal(capturedInit?.method, "POST");
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
    tenant_id: "tenant_123",
    event_types: ["role_binding.status_updated"],
    entity_type: "role_binding",
    entity_id: "binding_123",
    limit: 10,
  });
  assert.equal(result.generated_at, "2026-05-28T12:05:00.000Z");
  assert.equal(result.events[0]?.event_type, "role_binding.status_updated");
});

test("operations.getTelemetry loads the engine operational telemetry snapshot", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test",
    fetch: async (input, init) => {
      capturedUrl = input;
      capturedInit = init;

      const response: OperationalTelemetrySnapshot = {
        generated_at: "2026-05-28T12:10:00.000Z",
        resolve_session: {
          total_requests: 1,
          success_count: 1,
          failure_count: 0,
          token_failure_count: 0,
          availability_failure_count: 0,
          tenant_access_failure_count: 0,
          average_duration_ms: 10,
          last_duration_ms: 10,
          last_error_code: null,
          last_resolved_at: "2026-05-28T12:09:00.000Z",
          last_failed_at: null,
        },
        authorization: {
          authorize_check_total: 2,
          authorize_explain_total: 1,
          decision_cache_hit_count: 1,
          decision_cache_miss_count: 1,
          expansion_cache_hit_count: 1,
          expansion_cache_miss_count: 0,
          average_check_duration_ms: 9,
          average_explain_duration_ms: 15,
          last_check_duration_ms: 9,
          last_explain_duration_ms: 15,
          last_decision_at: "2026-05-28T12:09:30.000Z",
        },
        replay: {
          batches_processed_total: 1,
          batches_with_failures_total: 0,
          events_claimed_total: 2,
          events_published_total: 2,
          events_failed_total: 0,
          average_batch_duration_ms: 20,
          last_batch_duration_ms: 20,
          last_batch_completed_at: "2026-05-28T12:08:00.000Z",
        },
        identity_lifecycle: {
          status: "not_configured",
          webhook_events_processed_total: 0,
          webhook_failures_total: 0,
          reconciliation_runs_total: 0,
          reconciliation_anomalies_total: 0,
          last_webhook_at: null,
          last_reconciliation_at: null,
          notes: "pending",
        },
        rollout_diagnostics: {
          bridge_failure_visibility_ready: false,
          decision_latency_visibility_ready: true,
          replay_visibility_ready: true,
          identity_lifecycle_visibility_ready: false,
        },
      };

      return createJsonResponse(response, 200);
    },
  });

  const result = await client.operations.getTelemetry();

  assert.equal(capturedUrl, "https://engine.example.test/v1/operations/telemetry");
  assert.equal(capturedInit?.method, "GET");
  assert.equal(capturedInit?.body, undefined);
  assert.equal(result.authorization.average_check_duration_ms, 9);
  assert.equal(result.rollout_diagnostics.replay_visibility_ready, true);
});

test("controlPlane.updateRoleDefinitionStatus maps a successful path-param request", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test/",
    fetch: async (input, init) => {
      capturedUrl = input;
      capturedInit = init;

      const response: UpdateRoleDefinitionStatusResponse = {
        role_definition: {
          role_definition_id: "role_123",
          tenant_id: "tenant_123",
          application_id: "app_123",
          name: "Admin",
          description: null,
          status: "active",
          approval_required: true,
          created_at: "2026-05-28T00:00:00.000Z",
          updated_at: "2026-05-28T00:00:00.000Z",
          created_by: "principal_123",
          updated_by: "principal_123",
        },
        audit: {
          audit_event_id: "audit_123",
        },
      };

      return createJsonResponse(response, 200);
    },
  });

  const result = await client.controlPlane.updateRoleDefinitionStatus({
    tenant_id: "tenant_123",
    role_definition_id: "role_123",
    status: "active",
    actor_principal_id: "principal_123",
    actor_subject: "user@example.com",
    reason: "Approval completed",
  });

  assert.equal(
    capturedUrl,
    "https://engine.example.test/v1/role-definitions/role_123/status",
  );
  assert.equal(capturedInit?.method, "PATCH");
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
    tenant_id: "tenant_123",
    status: "active",
    actor_principal_id: "principal_123",
    actor_subject: "user@example.com",
    reason: "Approval completed",
  });
  assert.equal(result.audit.audit_event_id, "audit_123");
  assert.equal(result.role_definition.status, "active");
});

test("controlPlane.listApplications maps a successful query request", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test/",
    fetch: async (input, init) => {
      capturedUrl = input;
      capturedInit = init;

      const response: ListApplicationsResponse = {
        generated_at: "2026-05-29T08:00:00.000Z",
        applications: [
          {
            application_id: "app_123",
            tenant_id: "tenant_123",
            slug: "billing",
            display_name: "Billing",
            status: "active",
            created_at: "2026-05-28T00:00:00.000Z",
            updated_at: "2026-05-28T00:00:00.000Z",
            created_by: "operator@example.com",
            updated_by: "operator@example.com",
          },
        ],
      };

      return createJsonResponse(response, 200);
    },
  });

  const result = await client.controlPlane.listApplications({
    tenant_id: "tenant_123",
    statuses: ["active"],
    limit: 25,
  });

  assert.equal(capturedUrl, "https://engine.example.test/v1/applications/query");
  assert.equal(capturedInit?.method, "POST");
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
    tenant_id: "tenant_123",
    statuses: ["active"],
    limit: 25,
  });
  assert.equal(result.applications[0]?.application_id, "app_123");
});

test("controlPlane.listPermissions maps a successful query request", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test/",
    fetch: async (input, init) => {
      capturedUrl = input;
      capturedInit = init;

      const response: ListPermissionsResponse = {
        generated_at: "2026-05-29T08:00:00.000Z",
        permissions: [
          {
            permission_id: "perm_123",
            tenant_id: "tenant_123",
            application_id: "app_123",
            action: "invoice.read",
            resource_type: "invoice",
            description: null,
            created_at: "2026-05-28T00:00:00.000Z",
            updated_at: "2026-05-28T00:00:00.000Z",
            created_by: "operator@example.com",
            updated_by: "operator@example.com",
          },
        ],
      };

      return createJsonResponse(response, 200);
    },
  });

  const result = await client.controlPlane.listPermissions({
    tenant_id: "tenant_123",
    application_id: "app_123",
    action: "invoice.read",
  });

  assert.equal(capturedUrl, "https://engine.example.test/v1/permissions/query");
  assert.equal(capturedInit?.method, "POST");
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
    tenant_id: "tenant_123",
    application_id: "app_123",
    action: "invoice.read",
  });
  assert.equal(result.permissions[0]?.permission_id, "perm_123");
});

test("controlPlane.listRoleDefinitions maps a successful query request", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test/",
    fetch: async (input, init) => {
      capturedUrl = input;
      capturedInit = init;

      const response: ListRoleDefinitionsResponse = {
        generated_at: "2026-05-29T08:00:00.000Z",
        role_definitions: [
          {
            role_definition_id: "role_123",
            tenant_id: "tenant_123",
            application_id: "app_123",
            name: "billing-admin",
            description: null,
            status: "active",
            approval_required: true,
            created_at: "2026-05-28T00:00:00.000Z",
            updated_at: "2026-05-28T00:00:00.000Z",
            created_by: "operator@example.com",
            updated_by: "operator@example.com",
          },
        ],
      };

      return createJsonResponse(response, 200);
    },
  });

  const result = await client.controlPlane.listRoleDefinitions({
    tenant_id: "tenant_123",
    application_id: "app_123",
    statuses: ["active"],
    approval_required: true,
  });

  assert.equal(capturedUrl, "https://engine.example.test/v1/role-definitions/query");
  assert.equal(capturedInit?.method, "POST");
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
    tenant_id: "tenant_123",
    application_id: "app_123",
    statuses: ["active"],
    approval_required: true,
  });
  assert.equal(result.role_definitions[0]?.role_definition_id, "role_123");
});

test("controlPlane.updateRoleBindingStatus maps a successful path-param request", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test/",
    fetch: async (input, init) => {
      capturedUrl = input;
      capturedInit = init;

      const response: UpdateRoleBindingStatusResponse = {
        role_binding: {
          role_binding_id: "binding_123",
          tenant_id: "tenant_123",
          role_definition_id: "role_123",
          role_binding_status: "active",
          subject_principal_id: "principal_123",
          subject_group_id: null,
          scope_type: "application",
          scope_application_id: "app_123",
          scope_resource_type: null,
          scope_resource_id: null,
          created_at: "2026-05-28T00:00:00.000Z",
          updated_at: "2026-05-28T00:05:00.000Z",
          created_by: "user@example.com",
          updated_by: "approver@example.com",
        },
        audit: {
          audit_event_id: "audit_456",
        },
      };

      return createJsonResponse(response, 200);
    },
  });

  const result = await client.controlPlane.updateRoleBindingStatus({
    tenant_id: "tenant_123",
    role_binding_id: "binding_123",
    role_binding_status: "active",
    actor_principal_id: "principal_approver",
    actor_subject: "approver@example.com",
    reason: "Approval completed",
  });

  assert.equal(
    capturedUrl,
    "https://engine.example.test/v1/role-bindings/binding_123/status",
  );
  assert.equal(capturedInit?.method, "PATCH");
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
    tenant_id: "tenant_123",
    role_binding_status: "active",
    actor_principal_id: "principal_approver",
    actor_subject: "approver@example.com",
    reason: "Approval completed",
  });
  assert.equal(result.audit.audit_event_id, "audit_456");
  assert.equal(result.role_binding.role_binding_status, "active");
});

test("authorize.check preserves additive Phase 5 deny reason codes", async () => {
  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test",
    fetch: async () =>
      createJsonResponse(
        {
          outcome: "deny",
          decision_id: "dec_456",
          reason_code: "PRINCIPAL_SUSPENDED",
          matched_bindings: [],
          deny_source: null,
        },
        200,
      ),
  });

  const result = await client.authorize.check({
    tenant_id: "tenant_123",
    principal_id: "principal_123",
    application_id: "app_123",
    action: "payments.approve",
    resource_type: "invoice",
    resource_id: "invoice_123",
  });

  assert.equal(result.outcome, "deny");
  assert.equal(result.reason_code, "PRINCIPAL_SUSPENDED");
  assert.deepEqual(result.matched_bindings, []);
  assert.ok(!("deny_source" in result));
});

test("non-2xx responses are mapped into XypesIdentityApiError", async () => {
  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test",
    fetch: async () =>
      createJsonResponse(
        {
          error: "Create Application Error",
          message: "Application slug already exists for tenant",
          statusCode: 409,
          code: "APPLICATION_DUPLICATE_TENANT_SLUG",
        },
        409,
      ),
  });

  await assert.rejects(
    () =>
      client.controlPlane.createApplication({
        tenant_id: "tenant_123",
        slug: "hr",
        display_name: "HR",
        actor_principal_id: "principal_123",
        actor_subject: "user@example.com",
        reason: "Initial registration",
      }),
    (error: unknown) => {
      assert.ok(error instanceof XypesIdentityApiError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "APPLICATION_DUPLICATE_TENANT_SLUG");
      assert.equal(error.error, "Create Application Error");
      assert.equal(error.message, "Application slug already exists for tenant");
      return true;
    },
  );
});

test("controlPlane.createRoleBinding preserves additive Phase 5 control-plane error codes", async () => {
  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test",
    fetch: async () =>
      createJsonResponse(
        {
          error: "Create Role Binding Error",
          message:
            "The requested role binding is blocked by a toxic role combination with existing role binding binding-existing. Finance approvers cannot also request vendor payments.",
          statusCode: 409,
          code: "ROLE_BINDING_SOD_CONFLICT",
        },
        409,
      ),
  });

  await assert.rejects(
    () =>
      client.controlPlane.createRoleBinding({
        tenant_id: "tenant_123",
        role_definition_id: "role_123",
        subject_principal_id: "principal_123",
        subject_group_id: null,
        scope_type: "application",
        scope_application_id: "app_123",
        scope_resource_type: null,
        scope_resource_id: null,
        actor_principal_id: "principal_operator",
        actor_subject: "operator@example.com",
        reason: "Grant finance approval access",
      }),
    (error: unknown) => {
      assert.ok(error instanceof XypesIdentityApiError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "ROLE_BINDING_SOD_CONFLICT");
      assert.equal(error.error, "Create Role Binding Error");
      return true;
    },
  );
});