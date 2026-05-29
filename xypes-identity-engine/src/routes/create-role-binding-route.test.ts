import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import { CreateRoleBindingError } from "../domain/role-binding-errors.js";
import type { RoleBindingState } from "@xypes-identity/shared";
import type {
  CreateRoleBindingDependencies,
  CreateRoleBindingPersistenceInput,
  RoleBindingRepository,
  UpdateRoleBindingStatusPersistenceInput,
} from "../domain/role-binding-types.js";

class RecordingRoleBindingRepository implements RoleBindingRepository {
  input: CreateRoleBindingPersistenceInput | null = null;

  constructor(private readonly error: Error | null = null) {}

  async createRoleBinding(input: CreateRoleBindingPersistenceInput): Promise<RoleBindingState> {
    this.input = input;

    if (this.error !== null) {
      throw this.error;
    }

    return {
      ...input.role_binding,
      role_binding_status: "active",
    };
  }

  async updateRoleBindingStatus(
    _input: UpdateRoleBindingStatusPersistenceInput,
  ): Promise<RoleBindingState> {
    throw new Error("unused in this test");
  }
}

const buildRouteDependencies = (
  repository: RoleBindingRepository,
): CreateRoleBindingDependencies => ({
  roleBindingRepository: repository,
  idGenerator: {
    nextId: (() => {
      const ids = ["binding-1", "audit-1", "outbox-1"];

      return () => {
        const nextId = ids.shift();

        if (nextId === undefined) {
          throw new Error("No more test ids available.");
        }

        return nextId;
      };
    })(),
  },
  clock: {
    now: () => new Date("2026-05-28T12:00:00.000Z"),
  },
});

test("POST /v1/role-bindings returns the created role binding and audit reference", async (t) => {
  const repository = new RecordingRoleBindingRepository();
  const app = await buildApp({
    roleBindingCreate: buildRouteDependencies(repository),
    principalRepository: {
      async findBySubject() {
        throw new Error("unused in this test");
      },
      async findTenantMembership() {
        throw new Error("unused in this test");
      },
    },
    tokenVerifier: {
      async verify() {
        throw new Error("unused in this test");
      },
    },
    auditPublisher: {
      async publish() {
        throw new Error("unused in this test");
      },
    },
    decisionIdGenerator: {
      nextId: () => "unused",
    },
    clock: {
      now: () => new Date("2026-05-28T12:00:00.000Z"),
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/role-bindings",
    payload: {
      tenant_id: "tenant-1",
      role_definition_id: "role-1",
      subject_principal_id: null,
      subject_group_id: "group-1",
      scope_type: "application",
      scope_application_id: "application-1",
      scope_resource_type: null,
      scope_resource_id: null,
      actor_principal_id: "principal-operator",
      actor_subject: "operator@example.com",
      reason: "Grant group access",
    },
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), {
    role_binding: {
      role_binding_id: "binding-1",
      tenant_id: "tenant-1",
      role_definition_id: "role-1",
      role_binding_status: "active",
      subject_principal_id: null,
      subject_group_id: "group-1",
      scope_type: "application",
      scope_application_id: "application-1",
      scope_resource_type: null,
      scope_resource_id: null,
      created_at: "2026-05-28T12:00:00.000Z",
      updated_at: "2026-05-28T12:00:00.000Z",
      created_by: "operator@example.com",
      updated_by: "operator@example.com",
    },
    audit: {
      audit_event_id: "audit-1",
    },
  });
  assert.equal(repository.input?.role_binding.role_definition_id, "role-1");
});

test("POST /v1/role-bindings maps missing role definitions to 404", async (t) => {
  const app = await buildApp({
    roleBindingCreate: buildRouteDependencies(
      new RecordingRoleBindingRepository(
        new CreateRoleBindingError(
          "ROLE_BINDING_ROLE_DEFINITION_NOT_FOUND",
          "The role definition does not exist for the supplied tenant.",
          404,
        ),
      ),
    ),
    principalRepository: {
      async findBySubject() {
        throw new Error("unused in this test");
      },
      async findTenantMembership() {
        throw new Error("unused in this test");
      },
    },
    tokenVerifier: {
      async verify() {
        throw new Error("unused in this test");
      },
    },
    auditPublisher: {
      async publish() {
        throw new Error("unused in this test");
      },
    },
    decisionIdGenerator: {
      nextId: () => "unused",
    },
    clock: {
      now: () => new Date("2026-05-28T12:00:00.000Z"),
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/role-bindings",
    payload: {
      tenant_id: "tenant-1",
      role_definition_id: "role-missing",
      subject_principal_id: "principal-1",
      subject_group_id: null,
      scope_type: "tenant",
      scope_application_id: null,
      scope_resource_type: null,
      scope_resource_id: null,
      actor_principal_id: null,
      actor_subject: "operator@example.com",
      reason: "Grant tenant access",
    },
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), {
    error: "Create Role Binding Error",
    message: "The role definition does not exist for the supplied tenant.",
    statusCode: 404,
    code: "ROLE_BINDING_ROLE_DEFINITION_NOT_FOUND",
  });
});

test("POST /v1/role-bindings maps toxic role combinations to 409", async (t) => {
  const app = await buildApp({
    roleBindingCreate: buildRouteDependencies(
      new RecordingRoleBindingRepository(
        new CreateRoleBindingError(
          "ROLE_BINDING_SOD_CONFLICT",
          "The requested role binding is blocked by a toxic role combination with existing role binding binding-existing. Finance approvers cannot also request vendor payments.",
          409,
        ),
      ),
    ),
    principalRepository: {
      async findBySubject() {
        throw new Error("unused in this test");
      },
      async findTenantMembership() {
        throw new Error("unused in this test");
      },
    },
    tokenVerifier: {
      async verify() {
        throw new Error("unused in this test");
      },
    },
    auditPublisher: {
      async publish() {
        throw new Error("unused in this test");
      },
    },
    decisionIdGenerator: {
      nextId: () => "unused",
    },
    clock: {
      now: () => new Date("2026-05-28T12:00:00.000Z"),
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/role-bindings",
    payload: {
      tenant_id: "tenant-1",
      role_definition_id: "role-1",
      subject_principal_id: "principal-1",
      subject_group_id: null,
      scope_type: "application",
      scope_application_id: "application-1",
      scope_resource_type: null,
      scope_resource_id: null,
      actor_principal_id: "principal-operator",
      actor_subject: "operator@example.com",
      reason: "Grant finance approval access",
    },
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