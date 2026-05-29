import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import type { AuthorizationRepository } from "../domain/authorization-types.js";

type AuthorizationCheckInput = Parameters<
  AuthorizationRepository["findDirectPrincipalAllowBindings"]
>[0];

type AuthorizationMatchedBindings = Awaited<
  ReturnType<AuthorizationRepository["findDirectPrincipalAllowBindings"]>
>;

type AuthorizationDenyPolicies = Awaited<
  ReturnType<AuthorizationRepository["findDirectPrincipalDenyPolicies"]>
>;

type AuthorizationTraversalHits = Awaited<
  ReturnType<AuthorizationRepository["findPrincipalGroupTraversalHits"]>
>;

class InMemoryAuthorizationRepository implements AuthorizationRepository {
  constructor(
    private readonly matchedBindings: AuthorizationMatchedBindings,
    private readonly denyPolicies: AuthorizationDenyPolicies,
    private readonly traversalHits: AuthorizationTraversalHits = [],
    private readonly principalAccessState: { principal_status: "active" | "suspended"; tenant_membership_status: "active" | "suspended" | null } | null = {
      principal_status: "active",
      tenant_membership_status: "active",
    },
  ) {}

  async findPrincipalAccessState(_input: AuthorizationCheckInput) {
    return this.principalAccessState;
  }

  async findDirectPrincipalAllowBindings(_input: AuthorizationCheckInput) {
    return this.matchedBindings;
  }

  async findDirectPrincipalDenyPolicies(_input: AuthorizationCheckInput) {
    return this.denyPolicies;
  }

  async findPrincipalGroupTraversalHits(_input: AuthorizationCheckInput) {
    return this.traversalHits;
  }
}

test("POST /v1/authorize/check returns allow for a direct principal binding", async (t) => {
  const app = await buildApp({
    authorizationCheck: {
      authorizationRepository: new InMemoryAuthorizationRepository(
        [
          {
            role_binding_id: "binding-1",
            role_definition_id: "role-1",
            permission_id: "permission-1",
            scope_type: "resource",
            scope_application_id: "application-1",
            scope_resource_type: "document",
            scope_resource_id: "document-1",
            subject: {
              subject_type: "principal",
              subject_principal_id: "principal-1",
              subject_group_id: null,
              membership_depth: null,
            },
          },
        ],
        [],
      ),
      decisionIdGenerator: {
        nextId: () => "decision-route-123",
      },
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/authorize/check",
    payload: {
      tenant_id: "tenant-1",
      principal_id: "principal-1",
      application_id: "application-1",
      action: "read",
      resource_type: "document",
      resource_id: "document-1",
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    outcome: "allow",
    decision_id: "decision-route-123",
    reason_code: "ALLOW_MATCHED_BINDING",
    matched_bindings: [
      {
        role_binding_id: "binding-1",
        role_definition_id: "role-1",
        permission_id: "permission-1",
        scope_type: "resource",
        scope_application_id: "application-1",
        scope_resource_type: "document",
        scope_resource_id: "document-1",
      },
    ],
    deny_source: null,
  });
});

test("POST /v1/authorize/check returns a suspension-specific deny when the tenant membership is suspended", async (t) => {
  const app = await buildApp({
    authorizationCheck: {
      authorizationRepository: new InMemoryAuthorizationRepository(
        [
          {
            role_binding_id: "binding-1",
            role_definition_id: "role-1",
            permission_id: "permission-1",
            scope_type: "resource",
            scope_application_id: "application-1",
            scope_resource_type: "document",
            scope_resource_id: "document-1",
            subject: {
              subject_type: "principal",
              subject_principal_id: "principal-1",
              subject_group_id: null,
              membership_depth: null,
            },
          },
        ],
        [],
        [],
        {
          principal_status: "active",
          tenant_membership_status: "suspended",
        },
      ),
      decisionIdGenerator: {
        nextId: () => "decision-route-suspended-123",
      },
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/authorize/check",
    payload: {
      tenant_id: "tenant-1",
      principal_id: "principal-1",
      application_id: "application-1",
      action: "read",
      resource_type: "document",
      resource_id: "document-1",
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    outcome: "deny",
    decision_id: "decision-route-suspended-123",
    reason_code: "TENANT_MEMBERSHIP_SUSPENDED",
    matched_bindings: [],
    deny_source: null,
  });
});