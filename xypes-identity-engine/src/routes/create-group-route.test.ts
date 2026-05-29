import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import { CreateGroupError } from "../domain/group-errors.js";
import type { CreateGroupDependencies, CreateGroupPersistenceInput, GroupRepository } from "../domain/group-types.js";

class RecordingGroupRepository implements GroupRepository {
  input: CreateGroupPersistenceInput | null = null;

  constructor(private readonly error: Error | null = null) {}

  async createGroup(input: CreateGroupPersistenceInput): Promise<void> {
    this.input = input;

    if (this.error !== null) {
      throw this.error;
    }
  }
}

const buildRouteDependencies = (repository: GroupRepository): CreateGroupDependencies => ({
  groupRepository: repository,
  idGenerator: {
    nextId: (() => {
      const ids = ["group-1", "audit-1", "outbox-1"];

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

test("POST /v1/groups returns the created group and audit reference", async (t) => {
  const repository = new RecordingGroupRepository();
  const app = await buildApp({
    groupCreate: buildRouteDependencies(repository),
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
    url: "/v1/groups",
    payload: {
      tenant_id: "tenant-1",
      scope_application_id: "application-1",
      name: "billing-admins",
      description: "Billing administrators",
      group_type: "manual",
      owner_principal_id: "principal-owner",
      scope_type: "application",
      scope_resource_type: null,
      scope_resource_id: null,
      actor_principal_id: "principal-operator",
      actor_subject: "operator@example.com",
      reason: "Create admin group",
    },
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), {
    group: {
      group_id: "group-1",
      tenant_id: "tenant-1",
      scope_application_id: "application-1",
      name: "billing-admins",
      description: "Billing administrators",
      group_type: "manual",
      owner_principal_id: "principal-owner",
      scope_type: "application",
      scope_resource_type: null,
      scope_resource_id: null,
      created_at: "2026-05-28T12:00:00.000Z",
      updated_at: "2026-05-28T12:00:00.000Z",
      created_by: "operator@example.com",
      updated_by: "operator@example.com",
    },
    audit: {
      audit_event_id: "audit-1",
    },
  });
  assert.equal(repository.input?.group.name, "billing-admins");
});

test("POST /v1/groups maps duplicate names to 409", async (t) => {
  const app = await buildApp({
    groupCreate: buildRouteDependencies(
      new RecordingGroupRepository(
        new CreateGroupError(
          "GROUP_DUPLICATE_NAME",
          "A group with this name already exists for the tenant.",
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
    url: "/v1/groups",
    payload: {
      tenant_id: "tenant-1",
      scope_application_id: null,
      name: "billing-admins",
      description: null,
      group_type: "manual",
      owner_principal_id: "principal-owner",
      scope_type: "tenant",
      scope_resource_type: null,
      scope_resource_id: null,
      actor_principal_id: null,
      actor_subject: "operator@example.com",
      reason: "Create duplicate group",
    },
  });

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.json(), {
    error: "Create Group Error",
    message: "A group with this name already exists for the tenant.",
    statusCode: 409,
    code: "GROUP_DUPLICATE_NAME",
  });
});