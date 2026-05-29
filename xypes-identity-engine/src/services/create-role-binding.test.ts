import assert from "node:assert/strict";
import test from "node:test";

import type { RoleBindingState } from "@xypes-identity/shared";

import type {
  CreateRoleBindingPersistenceInput,
  RoleBindingRepository,
  UpdateRoleBindingStatusPersistenceInput,
} from "../domain/role-binding-types.js";
import { createRoleBinding } from "./create-role-binding.js";

class RecordingRoleBindingRepository implements RoleBindingRepository {
  input: CreateRoleBindingPersistenceInput | null = null;

  async createRoleBinding(input: CreateRoleBindingPersistenceInput): Promise<RoleBindingState> {
    this.input = input;

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

test("createRoleBinding generates ids and persists an audited role binding", async () => {
  const repository = new RecordingRoleBindingRepository();
  const generatedIds = ["binding-1", "audit-1", "outbox-1"];

  const result = await createRoleBinding(
    {
      tenant_id: "tenant-1",
      role_definition_id: "role-1",
      subject_principal_id: "principal-1",
      subject_group_id: null,
      scope_type: "resource",
      scope_application_id: "application-1",
      scope_resource_type: "invoice",
      scope_resource_id: "invoice-42",
      actor_principal_id: "principal-operator",
      actor_subject: "operator@example.com",
      reason: "Grant billing access",
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
      scope_type: "resource",
      scope_application_id: "application-1",
      scope_resource_type: "invoice",
      scope_resource_id: "invoice-42",
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
    role_binding: {
      role_binding_id: "binding-1",
      tenant_id: "tenant-1",
      role_definition_id: "role-1",
      subject_principal_id: "principal-1",
      subject_group_id: null,
      scope_type: "resource",
      scope_application_id: "application-1",
      scope_resource_type: "invoice",
      scope_resource_id: "invoice-42",
      created_at: "2026-05-28T12:00:00.000Z",
      updated_at: "2026-05-28T12:00:00.000Z",
      created_by: "operator@example.com",
      updated_by: "operator@example.com",
    },
    audit_event_id: "audit-1",
    outbox_event_id: "outbox-1",
    actor_principal_id: "principal-operator",
    actor_subject: "operator@example.com",
    reason: "Grant billing access",
    correlation_id: "binding-1",
    reference_type: "application",
    reference_id: "application-1",
    occurred_at: "2026-05-28T12:00:00.000Z",
  });
});