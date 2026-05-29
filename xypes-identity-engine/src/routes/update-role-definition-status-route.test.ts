import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import { UpdateRoleDefinitionStatusError } from "../domain/role-definition-errors.js";
import type {
  CreateRoleDefinitionPersistenceInput,
  RoleDefinitionRepository,
  UpdateRoleDefinitionStatusDependencies,
  UpdateRoleDefinitionStatusPersistenceInput,
} from "../domain/role-definition-types.js";

class RecordingRoleDefinitionRepository implements RoleDefinitionRepository {
  updateInput: UpdateRoleDefinitionStatusPersistenceInput | null = null;

  constructor(private readonly error: Error | null = null) {}

  async createRoleDefinition(_input: CreateRoleDefinitionPersistenceInput): Promise<void> {
    throw new Error("unused in this test");
  }

  async updateRoleDefinitionStatus(
    input: UpdateRoleDefinitionStatusPersistenceInput,
  ) {
    this.updateInput = input;

    if (this.error !== null) {
      throw this.error;
    }

    return {
      role_definition_id: input.role_definition_id,
      tenant_id: input.tenant_id,
      application_id: "application-1",
      name: "billing-admin",
      description: "Can manage billing settings",
      status: input.status,
      approval_required: false,
      created_at: "2026-05-20T08:00:00.000Z",
      updated_at: input.occurred_at,
      created_by: "bootstrap@example.com",
      updated_by: input.actor_subject,
    };
  }
}

const buildRouteDependencies = (
  repository: RoleDefinitionRepository,
): UpdateRoleDefinitionStatusDependencies => ({
  roleDefinitionRepository: repository,
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
    now: () => new Date("2026-05-28T16:00:00.000Z"),
  },
});

test("PATCH /v1/role-definitions/:role_definition_id/status returns the updated role definition and audit reference", async (t) => {
  const repository = new RecordingRoleDefinitionRepository();
  const app = await buildApp({
    roleDefinitionStatusUpdate: buildRouteDependencies(repository),
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
      now: () => new Date("2026-05-28T16:00:00.000Z"),
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/v1/role-definitions/role-1/status",
    payload: {
      tenant_id: "tenant-1",
      status: "active",
      actor_principal_id: "principal-1",
      actor_subject: "operator@example.com",
      reason: "Ready for assignment",
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    role_definition: {
      role_definition_id: "role-1",
      tenant_id: "tenant-1",
      application_id: "application-1",
      name: "billing-admin",
      description: "Can manage billing settings",
      status: "active",
      approval_required: false,
      created_at: "2026-05-20T08:00:00.000Z",
      updated_at: "2026-05-28T16:00:00.000Z",
      created_by: "bootstrap@example.com",
      updated_by: "operator@example.com",
    },
    audit: {
      audit_event_id: "audit-1",
    },
  });
  assert.equal(repository.updateInput?.role_definition_id, "role-1");
  assert.equal(repository.updateInput?.status, "active");
});

test("PATCH /v1/role-definitions/:role_definition_id/status maps missing role definitions to 404", async (t) => {
  const app = await buildApp({
    roleDefinitionStatusUpdate: buildRouteDependencies(
      new RecordingRoleDefinitionRepository(
        new UpdateRoleDefinitionStatusError(
          "ROLE_DEFINITION_NOT_FOUND",
          "The role definition does not exist for the supplied tenant.",
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
      now: () => new Date("2026-05-28T16:00:00.000Z"),
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/v1/role-definitions/role-missing/status",
    payload: {
      tenant_id: "tenant-1",
      status: "retired",
      actor_principal_id: null,
      actor_subject: "operator@example.com",
      reason: "Cleanup",
    },
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), {
    error: "Update Role Definition Status Error",
    message: "The role definition does not exist for the supplied tenant.",
    statusCode: 404,
    code: "ROLE_DEFINITION_NOT_FOUND",
  });
});