import assert from "node:assert/strict";
import test from "node:test";

import type {
  AttachRolePermissionPersistenceInput,
  RolePermissionRepository,
} from "../domain/role-permission-types.js";
import { attachRolePermission } from "./attach-role-permission.js";

class RecordingRolePermissionRepository implements RolePermissionRepository {
  input: AttachRolePermissionPersistenceInput | null = null;

  async attachRolePermission(input: AttachRolePermissionPersistenceInput): Promise<void> {
    this.input = input;
  }
}

test("attachRolePermission generates ids and persists an audited role permission", async () => {
  const repository = new RecordingRolePermissionRepository();
  const generatedIds = ["role-permission-1", "audit-1", "outbox-1"];

  const result = await attachRolePermission(
    {
      tenant_id: "tenant-1",
      role_definition_id: "role-1",
      permission_id: "permission-1",
      actor_principal_id: "principal-1",
      actor_subject: "operator@example.com",
      reason: "Attach permission to role",
    },
    {
      rolePermissionRepository: repository,
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
  assert.deepEqual(repository.input, {
    role_permission: result.role_permission,
    audit_event_id: "audit-1",
    outbox_event_id: "outbox-1",
    actor_principal_id: "principal-1",
    actor_subject: "operator@example.com",
    reason: "Attach permission to role",
    correlation_id: "role-permission-1",
    reference_type: "role_definition",
    reference_id: "role-1",
    occurred_at: "2026-05-28T12:00:00.000Z",
  });
});