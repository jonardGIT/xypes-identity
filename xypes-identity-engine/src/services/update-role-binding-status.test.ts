import assert from "node:assert/strict";
import test from "node:test";

import type { RoleBindingState } from "@xypes-identity/shared";

import type {
  RoleBindingRepository,
  UpdateRoleBindingStatusPersistenceInput,
} from "../domain/role-binding-types.js";
import { updateRoleBindingStatus } from "./update-role-binding-status.js";

class RecordingRoleBindingRepository implements RoleBindingRepository {
  createInput: unknown = null;
  updateInput: UpdateRoleBindingStatusPersistenceInput | null = null;

  async createRoleBinding(): Promise<RoleBindingState> {
    throw new Error("unused in this test");
  }

  async updateRoleBindingStatus(
    input: UpdateRoleBindingStatusPersistenceInput,
  ): Promise<RoleBindingState> {
    this.updateInput = input;

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
      updated_at: input.occurred_at,
      created_by: "operator@example.com",
      updated_by: input.actor_subject,
    };
  }
}

test("updateRoleBindingStatus generates ids and persists an audited role binding status update", async () => {
  const repository = new RecordingRoleBindingRepository();
  const generatedIds = ["audit-1", "outbox-1"];

  const result = await updateRoleBindingStatus(
    {
      tenant_id: "tenant-1",
      role_binding_id: "binding-1",
      role_binding_status: "active",
      actor_principal_id: "principal-operator",
      actor_subject: "operator@example.com",
      reason: "Approve privileged assignment",
    },
    {
      roleBindingRepository: repository,
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
  assert.deepEqual(repository.updateInput, {
    tenant_id: "tenant-1",
    role_binding_id: "binding-1",
    role_binding_status: "active",
    audit_event_id: "audit-1",
    outbox_event_id: "outbox-1",
    actor_principal_id: "principal-operator",
    actor_subject: "operator@example.com",
    reason: "Approve privileged assignment",
    correlation_id: "binding-1",
    occurred_at: "2026-05-28T12:00:00.000Z",
  });
});