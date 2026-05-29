import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import { CreateDenyPolicyError } from "../domain/deny-policy-errors.js";
import type {
  CreateDenyPolicyDependencies,
  CreateDenyPolicyPersistenceInput,
  DenyPolicyRepository,
} from "../domain/deny-policy-types.js";

class RecordingDenyPolicyRepository implements DenyPolicyRepository {
  input: CreateDenyPolicyPersistenceInput | null = null;

  constructor(private readonly error: Error | null = null) {}

  async createDenyPolicy(input: CreateDenyPolicyPersistenceInput): Promise<void> {
    this.input = input;

    if (this.error !== null) {
      throw this.error;
    }
  }
}

const buildRouteDependencies = (
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

test("POST /v1/deny-policies returns the created deny policy and audit reference", async (t) => {
  const repository = new RecordingDenyPolicyRepository();
  const app = await buildApp({
    denyPolicyCreate: buildRouteDependencies(repository),
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
    url: "/v1/deny-policies",
    payload: {
      tenant_id: "tenant-1",
      permission_id: "permission-1",
      subject_principal_id: null,
      subject_group_id: "group-1",
      scope_type: "application",
      scope_application_id: "application-1",
      scope_resource_type: null,
      scope_resource_id: null,
      reason: "Suspend access pending review",
      actor_principal_id: "principal-operator",
      actor_subject: "operator@example.com",
      audit_reason: "Apply governance deny",
    },
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), {
    deny_policy: {
      deny_policy_id: "deny-1",
      tenant_id: "tenant-1",
      permission_id: "permission-1",
      subject_principal_id: null,
      subject_group_id: "group-1",
      scope_type: "application",
      scope_application_id: "application-1",
      scope_resource_type: null,
      scope_resource_id: null,
      reason: "Suspend access pending review",
      created_at: "2026-05-28T12:00:00.000Z",
      updated_at: "2026-05-28T12:00:00.000Z",
      created_by: "operator@example.com",
      updated_by: "operator@example.com",
    },
    audit: {
      audit_event_id: "audit-1",
    },
  });
  assert.equal(repository.input?.deny_policy.permission_id, "permission-1");
});

test("POST /v1/deny-policies maps missing permissions to 404", async (t) => {
  const app = await buildApp({
    denyPolicyCreate: buildRouteDependencies(
      new RecordingDenyPolicyRepository(
        new CreateDenyPolicyError(
          "DENY_POLICY_PERMISSION_NOT_FOUND",
          "The permission does not exist for the supplied tenant.",
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
      now: () => new Date("2026-05-28T12:00:00.000Z"),
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/deny-policies",
    payload: {
      tenant_id: "tenant-1",
      permission_id: "permission-missing",
      subject_principal_id: "principal-1",
      subject_group_id: null,
      scope_type: "tenant",
      scope_application_id: null,
      scope_resource_type: null,
      scope_resource_id: null,
      reason: null,
      actor_principal_id: null,
      actor_subject: "operator@example.com",
      audit_reason: "Apply governance deny",
    },
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), {
    error: "Create Deny Policy Error",
    message: "The permission does not exist for the supplied tenant.",
    statusCode: 404,
    code: "DENY_POLICY_PERMISSION_NOT_FOUND",
  });
});