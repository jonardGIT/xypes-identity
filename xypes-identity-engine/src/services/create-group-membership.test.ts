import assert from "node:assert/strict";
import test from "node:test";

import type { GroupMembershipState } from "@xypes-identity/shared";

import type {
  CreateGroupMembershipPersistenceInput,
  GroupMembershipRepository,
} from "../domain/group-membership-types.js";
import { createGroupMembership } from "./create-group-membership.js";

class RecordingGroupMembershipRepository implements GroupMembershipRepository {
  input: CreateGroupMembershipPersistenceInput | null = null;

  async createGroupMembership(input: CreateGroupMembershipPersistenceInput): Promise<void> {
    this.input = input;
  }
}

test("createGroupMembership generates ids and persists an audited principal membership", async () => {
  const repository = new RecordingGroupMembershipRepository();
  const generatedIds = ["membership-1", "audit-1", "outbox-1"];

  const result = await createGroupMembership(
    {
      tenant_id: "tenant-1",
      group_id: "group-1",
      member_principal_id: "principal-1",
      member_group_id: null,
      membership_source: "manual",
      actor_principal_id: "principal-operator",
      actor_subject: "operator@example.com",
      reason: "Add billing admin member",
    },
    {
      groupMembershipRepository: repository,
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
  assert.deepEqual(repository.input, {
    group_membership: result.group_membership as GroupMembershipState,
    audit_event_id: "audit-1",
    outbox_event_id: "outbox-1",
    actor_principal_id: "principal-operator",
    actor_subject: "operator@example.com",
    reason: "Add billing admin member",
    correlation_id: "membership-1",
    reference_type: "group",
    reference_id: "group-1",
    occurred_at: "2026-05-28T12:00:00.000Z",
  });
});