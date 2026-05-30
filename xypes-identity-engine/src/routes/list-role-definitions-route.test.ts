import assert from "node:assert/strict";
import test from "node:test";

import type { RoleDefinitionState } from "@xypes-identity/shared";

import { buildApp } from "../app.js";
import type {
  CreateRoleDefinitionPersistenceInput,
  ListRoleDefinitionsDependencies,
  ListRoleDefinitionsRepositoryInput,
  RoleDefinitionRepository,
  UpdateRoleDefinitionStatusPersistenceInput,
} from "../domain/role-definition-types.js";

class RecordingRoleDefinitionRepository implements RoleDefinitionRepository {
  listInput: ListRoleDefinitionsRepositoryInput | null = null;

  async createRoleDefinition(_input: CreateRoleDefinitionPersistenceInput): Promise<void> {
    throw new Error("unused in this test");
  }

  async listRoleDefinitions(
    input: ListRoleDefinitionsRepositoryInput,
  ): Promise<RoleDefinitionState[]> {
    this.listInput = input;

    return [
      {
        role_definition_id: "role-1",
        tenant_id: input.tenant_id,
        application_id: input.application_id ?? "application-1",
        name: "billing-admin",
        description: null,
        status: input.statuses?.[0] ?? "active",
        approval_required: input.approval_required ?? true,
        created_at: "2026-05-28T12:00:00.000Z",
        updated_at: "2026-05-28T12:00:00.000Z",
        created_by: "operator@example.com",
        updated_by: "operator@example.com",
      },
    ];
  }

  async updateRoleDefinitionStatus(
    _input: UpdateRoleDefinitionStatusPersistenceInput,
  ): Promise<RoleDefinitionState> {
    throw new Error("unused in this test");
  }
}

const buildRouteDependencies = (
  repository: RoleDefinitionRepository,
): ListRoleDefinitionsDependencies => ({
  roleDefinitionRepository: repository,
  clock: {
    now: () => new Date("2026-05-29T08:00:00.000Z"),
  },
});

test("POST /v1/role-definitions/query returns tenant-scoped role definitions", async (t) => {
  const repository = new RecordingRoleDefinitionRepository();
  const app = await buildApp({
    roleDefinitionRead: buildRouteDependencies(repository),
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
    url: "/v1/role-definitions/query",
    payload: {
      tenant_id: "tenant-1",
      application_id: "application-1",
      statuses: ["active"],
      approval_required: true,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    generated_at: "2026-05-29T08:00:00.000Z",
    role_definitions: [
      {
        role_definition_id: "role-1",
        tenant_id: "tenant-1",
        application_id: "application-1",
        name: "billing-admin",
        description: null,
        status: "active",
        approval_required: true,
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
    statuses: ["active"],
    approval_required: true,
  });
});