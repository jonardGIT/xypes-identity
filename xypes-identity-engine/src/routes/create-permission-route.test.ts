import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import { CreatePermissionError } from "../domain/permission-errors.js";
import type {
  CreatePermissionDependencies,
  CreatePermissionPersistenceInput,
  PermissionRepository,
} from "../domain/permission-types.js";

class RecordingPermissionRepository implements PermissionRepository {
  input: CreatePermissionPersistenceInput | null = null;

  constructor(private readonly error: Error | null = null) {}

  async createPermission(input: CreatePermissionPersistenceInput): Promise<void> {
    this.input = input;

    if (this.error !== null) {
      throw this.error;
    }
  }
}

const buildRouteDependencies = (
  repository: PermissionRepository,
): CreatePermissionDependencies => ({
  permissionRepository: repository,
  idGenerator: {
    nextId: (() => {
      const ids = ["permission-1", "audit-1", "outbox-1"];

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

test("POST /v1/permissions returns the created permission and audit reference", async (t) => {
  const repository = new RecordingPermissionRepository();
  const app = await buildApp({
    permissionCreate: buildRouteDependencies(repository),
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
    url: "/v1/permissions",
    payload: {
      tenant_id: "tenant-1",
      application_id: "application-1",
      action: "invoice.read",
      resource_type: "invoice",
      description: "Read invoice records",
      actor_principal_id: "principal-1",
      actor_subject: "operator@example.com",
      reason: "Bootstrap permission catalog",
    },
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), {
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
  assert.equal(repository.input?.permission.action, "invoice.read");
});

test("POST /v1/permissions maps duplicates to 409", async (t) => {
  const app = await buildApp({
    permissionCreate: buildRouteDependencies(
      new RecordingPermissionRepository(
        new CreatePermissionError(
          "PERMISSION_DUPLICATE",
          "A permission with this action and resource type already exists for the application.",
          409,
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
    url: "/v1/permissions",
    payload: {
      tenant_id: "tenant-1",
      application_id: "application-1",
      action: "invoice.read",
      resource_type: "invoice",
      description: null,
      actor_principal_id: null,
      actor_subject: "operator@example.com",
      reason: "Bootstrap permission catalog",
    },
  });

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.json(), {
    error: "Create Permission Error",
    message: "A permission with this action and resource type already exists for the application.",
    statusCode: 409,
    code: "PERMISSION_DUPLICATE",
  });
});