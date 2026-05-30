import assert from "node:assert/strict";
import test from "node:test";

import type {
  CreatePermissionPersistenceInput,
  ListPermissionsRepositoryInput,
  PermissionRepository,
} from "../domain/permission-types.js";
import { createPermission } from "./create-permission.js";

class RecordingPermissionRepository implements PermissionRepository {
  input: CreatePermissionPersistenceInput | null = null;

  async createPermission(input: CreatePermissionPersistenceInput): Promise<void> {
    this.input = input;
  }

  async listPermissions(_input: ListPermissionsRepositoryInput) {
    return [];
  }
}

test("createPermission generates ids and persists an audited permission", async () => {
  const repository = new RecordingPermissionRepository();
  const generatedIds = ["permission-1", "audit-1", "outbox-1"];

  const result = await createPermission(
    {
      tenant_id: "tenant-1",
      application_id: "application-1",
      action: "invoice.read",
      resource_type: "invoice",
      description: "Read invoice records",
      actor_principal_id: "principal-1",
      actor_subject: "operator@example.com",
      reason: "Bootstrap permission catalog",
    },
    {
      permissionRepository: repository,
      idGenerator: {
        nextId: () => {
          const nextId = generatedIds.shift();

          if (nextId === undefined) {
            throw new Error("No more test ids available.");
          }

          return nextId;
        },
      },
      clock: {
        now: () => new Date("2026-05-28T12:00:00.000Z"),
      },
    },
  );

  assert.deepEqual(result, {
    permission: {
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
    audit: {
      audit_event_id: "audit-1",
    },
  });
  assert.deepEqual(repository.input, {
    permission: result.permission,
    audit_event_id: "audit-1",
    outbox_event_id: "outbox-1",
    actor_principal_id: "principal-1",
    actor_subject: "operator@example.com",
    reason: "Bootstrap permission catalog",
    correlation_id: "permission-1",
    reference_type: "application",
    reference_id: "application-1",
    occurred_at: "2026-05-28T12:00:00.000Z",
  });
});