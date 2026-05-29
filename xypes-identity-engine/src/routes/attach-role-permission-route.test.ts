import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import { AttachRolePermissionError } from "../domain/role-permission-errors.js";
import type {
  AttachRolePermissionDependencies,
  AttachRolePermissionPersistenceInput,
  RolePermissionRepository,
} from "../domain/role-permission-types.js";

class RecordingRolePermissionRepository implements RolePermissionRepository {
  input: AttachRolePermissionPersistenceInput | null = null;

  constructor(private readonly error: Error | null = null) {}

  async attachRolePermission(input: AttachRolePermissionPersistenceInput): Promise<void> {
    this.input = input;

    if (this.error !== null) {
      throw this.error;
    }
  }
}

const buildRouteDependencies = (
  repository: RolePermissionRepository,
): AttachRolePermissionDependencies => ({
  rolePermissionRepository: repository,
  idGenerator: {
    nextId: (() => {
      const ids = ["role-permission-1", "audit-1", "outbox-1"];

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

test("POST /v1/role-permissions returns the created role-permission attachment and audit reference", async (t) => {
  const repository = new RecordingRolePermissionRepository();
  const app = await buildApp({
    rolePermissionAttach: buildRouteDependencies(repository),
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
    url: "/v1/role-permissions",
    payload: {
      tenant_id: "tenant-1",
      role_definition_id: "role-1",
      permission_id: "permission-1",
      actor_principal_id: "principal-1",
      actor_subject: "operator@example.com",
      reason: "Attach permission to role",
    },
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), {
    role_permission: {
      role_permission_id: "role-permission-1",
      tenant_id: "tenant-1",
      role_definition_id: "role-1",
      permission_id: "permission-1",
      created_at: "2026-05-28T12:00:00.000Z",
      updated_at: "2026-05-28T12:00:00.000Z",
      created_by: "operator@example.com",
      updated_by: "operator@example.com",
    },
    audit: {
      audit_event_id: "audit-1",
    },
  });
  assert.equal(repository.input?.role_permission.permission_id, "permission-1");
});

test("POST /v1/role-permissions maps missing permissions to 404", async (t) => {
  const app = await buildApp({
    rolePermissionAttach: buildRouteDependencies(
      new RecordingRolePermissionRepository(
        new AttachRolePermissionError(
          "ROLE_PERMISSION_PERMISSION_NOT_FOUND",
          "The permission does not exist for the supplied tenant.",
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
    url: "/v1/role-permissions",
    payload: {
      tenant_id: "tenant-1",
      role_definition_id: "role-1",
      permission_id: "permission-missing",
      actor_principal_id: null,
      actor_subject: "operator@example.com",
      reason: "Attach permission to role",
    },
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), {
    error: "Attach Role Permission Error",
    message: "The permission does not exist for the supplied tenant.",
    statusCode: 404,
    code: "ROLE_PERMISSION_PERMISSION_NOT_FOUND",
  });
});