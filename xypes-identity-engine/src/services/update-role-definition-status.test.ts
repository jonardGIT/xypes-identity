import assert from "node:assert/strict";
import test from "node:test";

import type {
  CreateRoleDefinitionPersistenceInput,
  ListRoleDefinitionsRepositoryInput,
  RoleDefinitionRepository,
  UpdateRoleDefinitionStatusPersistenceInput,
} from "../domain/role-definition-types.js";
import { updateRoleDefinitionStatus } from "./update-role-definition-status.js";

class RecordingRoleDefinitionRepository implements RoleDefinitionRepository {
  updateInput: UpdateRoleDefinitionStatusPersistenceInput | null = null;

  async createRoleDefinition(_input: CreateRoleDefinitionPersistenceInput): Promise<void> {
    throw new Error("unused in this test");
  }

  async listRoleDefinitions(_input: ListRoleDefinitionsRepositoryInput) {
    return [];
  }

  async updateRoleDefinitionStatus(
    input: UpdateRoleDefinitionStatusPersistenceInput,
  ) {
    this.updateInput = input;

    return {
      role_definition_id: "role-1",
      tenant_id: "tenant-1",
      application_id: "application-1",
      name: "billing-admin",
      description: "Can manage billing settings",
      status: input.status,
      approval_required: true,
      created_at: "2026-05-20T08:00:00.000Z",
      updated_at: input.occurred_at,
      created_by: "bootstrap@example.com",
      updated_by: input.actor_subject,
    };
  }
}

test("updateRoleDefinitionStatus generates audit ids and persists an audited status update", async () => {
  const repository = new RecordingRoleDefinitionRepository();
  const generatedIds = ["audit-1", "outbox-1"];

  const result = await updateRoleDefinitionStatus(
    {
      tenant_id: "tenant-1",
      role_definition_id: "role-1",
      status: "active",
      actor_principal_id: "principal-1",
      actor_subject: "operator@example.com",
      reason: "Ready for assignment",
    },
    {
      roleDefinitionRepository: repository,
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
        now: () => new Date("2026-05-28T15:30:00.000Z"),
      },
    },
  );

  assert.deepEqual(result, {
    role_definition: {
      role_definition_id: "role-1",
      tenant_id: "tenant-1",
      application_id: "application-1",
      name: "billing-admin",
      description: "Can manage billing settings",
      status: "active",
      approval_required: true,
      created_at: "2026-05-20T08:00:00.000Z",
      updated_at: "2026-05-28T15:30:00.000Z",
      created_by: "bootstrap@example.com",
      updated_by: "operator@example.com",
    },
    audit: {
      audit_event_id: "audit-1",
    },
  });
  assert.deepEqual(repository.updateInput, {
    tenant_id: "tenant-1",
    role_definition_id: "role-1",
    status: "active",
    audit_event_id: "audit-1",
    outbox_event_id: "outbox-1",
    actor_principal_id: "principal-1",
    actor_subject: "operator@example.com",
    reason: "Ready for assignment",
    correlation_id: "role-1",
    occurred_at: "2026-05-28T15:30:00.000Z",
  });
});