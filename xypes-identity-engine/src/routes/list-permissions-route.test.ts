import assert from "node:assert/strict";
import test from "node:test";

import type { PermissionState } from "@xypes-identity/shared";

import { buildApp } from "../app.js";
import type {
  CreatePermissionPersistenceInput,
  ListPermissionsDependencies,
  ListPermissionsRepositoryInput,
  PermissionRepository,
} from "../domain/permission-types.js";

class RecordingPermissionRepository implements PermissionRepository {
  listInput: ListPermissionsRepositoryInput | null = null;

  async createPermission(_input: CreatePermissionPersistenceInput): Promise<void> {
    throw new Error("unused in this test");
  }

  async listPermissions(input: ListPermissionsRepositoryInput): Promise<PermissionState[]> {
    this.listInput = input;

    return [
      {
        permission_id: "permission-1",
        tenant_id: input.tenant_id,
        application_id: input.application_id ?? "application-1",
        action: input.action ?? "invoice.read",
        resource_type: input.resource_type ?? "invoice",
        description: "Read invoice records",
        created_at: "2026-05-28T12:00:00.000Z",
        updated_at: "2026-05-28T12:00:00.000Z",
        created_by: "operator@example.com",
        updated_by: "operator@example.com",
      },
    ];
  }
}

const buildRouteDependencies = (
  repository: PermissionRepository,
): ListPermissionsDependencies => ({
  permissionRepository: repository,
  clock: {
    now: () => new Date("2026-05-29T08:00:00.000Z"),
  },
});

test("POST /v1/permissions/query returns tenant-scoped permissions", async (t) => {
  const repository = new RecordingPermissionRepository();
  const app = await buildApp({
    permissionRead: buildRouteDependencies(repository),
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
      now: () => new Date("2026-05-29T08:00:00.000Z"),
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/permissions/query",
    payload: {
      tenant_id: "tenant-1",
      application_id: "application-1",
      action: "invoice.read",
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    generated_at: "2026-05-29T08:00:00.000Z",
    permissions: [
      {
        permission_id: "permission-1",
        tenant_id: "tenant-1",
        application_id: "application-1",
        action: "invoice.read",
        resource_type: "invoice",
        description: "Read invoice records",
        created_at: "2026-05-28T12:00:00.000Z",
        updated_at: "2026-05-28T12:00:00.000Z",
        created_by: "operator@example.com",
        updated_by: "operator@example.com",
      },
    ],
  });
  assert.deepEqual(repository.listInput, {
    tenant_id: "tenant-1",
    application_id: "application-1",
    action: "invoice.read",
  });
});