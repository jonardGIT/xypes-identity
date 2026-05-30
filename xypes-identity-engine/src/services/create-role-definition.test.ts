import assert from "node:assert/strict";
import test from "node:test";

import type { RoleDefinitionState } from "@xypes-identity/shared";
import type {
  CreateRoleDefinitionPersistenceInput,
  ListRoleDefinitionsRepositoryInput,
  RoleDefinitionRepository,
  UpdateRoleDefinitionStatusPersistenceInput,
} from "../domain/role-definition-types.js";
import { createRoleDefinition } from "./create-role-definition.js";

class RecordingRoleDefinitionRepository implements RoleDefinitionRepository {
  input: CreateRoleDefinitionPersistenceInput | null = null;

  async createRoleDefinition(input: CreateRoleDefinitionPersistenceInput): Promise<void> {
    this.input = input;
  }

  async listRoleDefinitions(_input: ListRoleDefinitionsRepositoryInput): Promise<RoleDefinitionState[]> {
    throw new Error("unused in this test");
  }

  async updateRoleDefinitionStatus(
    _input: UpdateRoleDefinitionStatusPersistenceInput,
  ): Promise<RoleDefinitionState> {
    throw new Error("unused in this test");
  }
}

test("createRoleDefinition generates ids and persists an audited role definition", async () => {
  const repository = new RecordingRoleDefinitionRepository();
  const generatedIds = ["role-1", "audit-1", "outbox-1"];

  const result = await createRoleDefinition(
    {
      tenant_id: "tenant-1",
      application_id: "application-1",
      name: "billing-admin",
      description: "Can manage billing settings",
      approval_required: true,
      actor_principal_id: "principal-1",
      actor_subject: "operator@example.com",
      reason: "Initial bootstrap role",
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
        now: () => new Date("2026-05-28T12:00:00.000Z"),
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
      status: "draft",
      approval_required: true,
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
    role_definition: result.role_definition,
    audit_event_id: "audit-1",
    outbox_event_id: "outbox-1",
    actor_principal_id: "principal-1",
    actor_subject: "operator@example.com",
    reason: "Initial bootstrap role",
    correlation_id: "role-1",
    reference_type: "application",
    reference_id: "application-1",
    occurred_at: "2026-05-28T12:00:00.000Z",
  });
});