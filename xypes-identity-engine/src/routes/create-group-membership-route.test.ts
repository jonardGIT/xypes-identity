import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import { CreateGroupMembershipError } from "../domain/group-membership-errors.js";
import type {
  CreateGroupMembershipDependencies,
  CreateGroupMembershipPersistenceInput,
  GroupMembershipRepository,
} from "../domain/group-membership-types.js";

class RecordingGroupMembershipRepository implements GroupMembershipRepository {
  input: CreateGroupMembershipPersistenceInput | null = null;

  constructor(private readonly error: Error | null = null) {}

  async createGroupMembership(input: CreateGroupMembershipPersistenceInput): Promise<void> {
    this.input = input;

    if (this.error !== null) {
      throw this.error;
    }
  }
}

const buildRouteDependencies = (
  repository: GroupMembershipRepository,
): CreateGroupMembershipDependencies => ({
  groupMembershipRepository: repository,
  idGenerator: {
    nextId: (() => {
      const ids = ["membership-1", "audit-1", "outbox-1"];

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

test("POST /v1/group-memberships returns the created membership and audit reference", async (t) => {
  const repository = new RecordingGroupMembershipRepository();
  const app = await buildApp({
    groupMembershipCreate: buildRouteDependencies(repository),
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
    url: "/v1/group-memberships",
    payload: {
      tenant_id: "tenant-1",
      group_id: "group-1",
      member_principal_id: "principal-1",
      member_group_id: null,
      membership_source: "manual",
      actor_principal_id: "principal-operator",
      actor_subject: "operator@example.com",
      reason: "Add billing admin member",
    },
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), {
    group_membership: {
      group_membership_id: "membership-1",
      tenant_id: "tenant-1",
      group_id: "group-1",
      member_principal_id: "principal-1",
      member_group_id: null,
      membership_source: "manual",
      created_at: "2026-05-28T12:00:00.000Z",
      updated_at: "2026-05-28T12:00:00.000Z",
      created_by: "operator@example.com",
      updated_by: "operator@example.com",
    },
    audit: {
      audit_event_id: "audit-1",
    },
  });
  assert.equal(repository.input?.group_membership.group_id, "group-1");
});

test("POST /v1/group-memberships maps cycle detection to 400", async (t) => {
  const app = await buildApp({
    groupMembershipCreate: buildRouteDependencies(
      new RecordingGroupMembershipRepository(
        new CreateGroupMembershipError(
          "GROUP_MEMBERSHIP_CYCLE_DETECTED",
          "The nested group membership would introduce a cycle.",
          400,
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
    url: "/v1/group-memberships",
    payload: {
      tenant_id: "tenant-1",
      group_id: "group-1",
      member_principal_id: null,
      member_group_id: "group-2",
      membership_source: "manual",
      actor_principal_id: null,
      actor_subject: "operator@example.com",
      reason: "Nest groups",
    },
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), {
    error: "Create Group Membership Error",
    message: "The nested group membership would introduce a cycle.",
    statusCode: 400,
    code: "GROUP_MEMBERSHIP_CYCLE_DETECTED",
  });
});