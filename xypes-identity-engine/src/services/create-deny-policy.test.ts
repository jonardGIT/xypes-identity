import assert from "node:assert/strict";
import test from "node:test";

import type {
  CreateDenyPolicyDependencies,
  CreateDenyPolicyPersistenceInput,
  DenyPolicyRepository,
} from "../domain/deny-policy-types.js";
import { createDenyPolicy } from "./create-deny-policy.js";

class RecordingDenyPolicyRepository implements DenyPolicyRepository {
  input: CreateDenyPolicyPersistenceInput | null = null;

  async createDenyPolicy(input: CreateDenyPolicyPersistenceInput): Promise<void> {
    this.input = input;
  }
}

const buildDependencies = (
  repository: DenyPolicyRepository,
): CreateDenyPolicyDependencies => ({
  denyPolicyRepository: repository,
  idGenerator: {
    nextId: (() => {
      const ids = ["deny-1", "audit-1", "outbox-1"];

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

test("createDenyPolicy returns created state and audit reference", async () => {
  const repository = new RecordingDenyPolicyRepository();

  const response = await createDenyPolicy(
    {
      tenant_id: "tenant-1",
      permission_id: "permission-1",
      subject_principal_id: "principal-1",
      subject_group_id: null,
      scope_type: "resource",
      scope_application_id: "application-1",
      scope_resource_type: "invoice",
      scope_resource_id: "invoice-42",
      reason: "Block finance export",
      actor_principal_id: "principal-operator",
      actor_subject: "operator@example.com",
      audit_reason: "Apply explicit deny for incident response",
    },
    buildDependencies(repository),
  );

  assert.deepEqual(response, {
    deny_policy: {
      deny_policy_id: "deny-1",
      tenant_id: "tenant-1",
      permission_id: "permission-1",
      subject_principal_id: "principal-1",
      subject_group_id: null,
      scope_type: "resource",
      scope_application_id: "application-1",
      scope_resource_type: "invoice",
      scope_resource_id: "invoice-42",
      reason: "Block finance export",
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
    deny_policy: response.deny_policy,
    audit_event_id: "audit-1",
    outbox_event_id: "outbox-1",
    actor_principal_id: "principal-operator",
    actor_subject: "operator@example.com",
    audit_reason: "Apply explicit deny for incident response",
    correlation_id: "deny-1",
    reference_type: "application",
    reference_id: "application-1",
    occurred_at: "2026-05-28T12:00:00.000Z",
  });
});