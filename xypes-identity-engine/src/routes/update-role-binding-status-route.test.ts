import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import {
  UpdateRoleBindingStatusError,
} from "../domain/role-binding-errors.js";
import type { RoleBindingState } from "@xypes-identity/shared";
import type {
  RoleBindingRepository,
  UpdateRoleBindingStatusDependencies,
  UpdateRoleBindingStatusPersistenceInput,
} from "../domain/role-binding-types.js";

class RecordingRoleBindingRepository implements RoleBindingRepository {
  createInput: unknown = null;
  updateInput: UpdateRoleBindingStatusPersistenceInput | null = null;

  constructor(private readonly error: Error | null = null) {}

  async createRoleBinding(): Promise<RoleBindingState> {
    throw new Error("unused in this test");
  }

  async updateRoleBindingStatus(
    input: UpdateRoleBindingStatusPersistenceInput,
  ): Promise<RoleBindingState> {
    this.updateInput = input;

    if (this.error !== null) {
      throw this.error;
    }

    return {
      role_binding_id: input.role_binding_id,
      tenant_id: input.tenant_id,
      role_definition_id: "role-1",
      role_binding_status: input.role_binding_status,
      subject_principal_id: "principal-1",
      subject_group_id: null,
      scope_type: "application",
      scope_application_id: "application-1",
      scope_resource_type: null,
      scope_resource_id: null,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-28T12:00:00.000Z",
      created_by: "operator@example.com",
      updated_by: "operator@example.com",
    };
  }
}

const buildRouteDependencies = (
  repository: RoleBindingRepository,
): UpdateRoleBindingStatusDependencies => ({
  roleBindingRepository: repository,
  idGenerator: {
    nextId: (() => {
      const ids = ["audit-1", "outbox-1"];

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

test("PATCH /v1/role-bindings/:role_binding_id/status returns the updated role binding and audit reference", async (t) => {
  const repository = new RecordingRoleBindingRepository();
  const app = await buildApp({
    roleBindingStatusUpdate: buildRouteDependencies(repository),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/v1/role-bindings/binding-1/status",
    payload: {
      tenant_id: "tenant-1",
      role_binding_status: "active",
      actor_principal_id: "principal-operator",
      actor_subject: "operator@example.com",
      reason: "Approve privileged assignment",
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    role_binding: {
      role_binding_id: "binding-1",
      tenant_id: "tenant-1",
      role_definition_id: "role-1",
      role_binding_status: "active",
      subject_principal_id: "principal-1",
      subject_group_id: null,
      scope_type: "application",
      scope_application_id: "application-1",
      scope_resource_type: null,
      scope_resource_id: null,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-28T12:00:00.000Z",
      created_by: "operator@example.com",
      updated_by: "operator@example.com",
    },
    audit: {
      audit_event_id: "audit-1",
    },
  });
  assert.equal(repository.updateInput?.role_binding_id, "binding-1");
});

test("PATCH /v1/role-bindings/:role_binding_id/status maps missing role bindings to 404", async (t) => {
  const app = await buildApp({
    roleBindingStatusUpdate: buildRouteDependencies(
      new RecordingRoleBindingRepository(
        new UpdateRoleBindingStatusError(
          "ROLE_BINDING_NOT_FOUND",
          "The role binding does not exist for the supplied tenant.",
          404,
        ),
      ),
    ),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/v1/role-bindings/binding-missing/status",
    payload: {
      tenant_id: "tenant-1",
      role_binding_status: "active",
      actor_principal_id: null,
      actor_subject: "operator@example.com",
      reason: "Approve privileged assignment",
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