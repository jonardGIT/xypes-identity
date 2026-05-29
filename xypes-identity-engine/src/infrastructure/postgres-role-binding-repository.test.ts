import assert from "node:assert/strict";
import test from "node:test";

import { CreateRoleBindingError } from "../domain/role-binding-errors.js";
import { UpdateRoleBindingStatusError } from "../domain/role-binding-errors.js";
import { PostgresRoleBindingRepository } from "./postgres-role-binding-repository.js";

class RecordingTransactionClient {
  readonly calls: Array<{ queryText: string; values: readonly unknown[] }> = [];
  released = false;

  constructor(
    private readonly failure: { atCall: number; error: Error } | null = null,
    private readonly rowsByCall: Record<number, readonly unknown[]> = {},
  ) {}

  async query<Row extends { [key: string]: unknown }>(
    queryText: string,
    values: readonly unknown[],
  ): Promise<{ rows: Row[] }> {
    this.calls.push({ queryText, values });

    if (this.failure !== null && this.calls.length === this.failure.atCall) {
      throw this.failure.error;
    }

    const rows = this.rowsByCall[this.calls.length];

    return { rows: (rows ?? []) as Row[] };
  }

  release(): void {
    this.released = true;
  }
}

class RecordingTransactionPool {
  connectCalls = 0;

  constructor(readonly client: RecordingTransactionClient) {}

  async connect(): Promise<RecordingTransactionClient> {
    this.connectCalls += 1;
    return this.client;
  }
}

const createInput = () => ({
  role_binding: {
    role_binding_id: "binding-1",
    tenant_id: "tenant-1",
    role_definition_id: "role-1",
    subject_principal_id: "principal-1",
    subject_group_id: null,
    scope_type: "resource" as const,
    scope_application_id: "application-1",
    scope_resource_type: "invoice",
    scope_resource_id: "invoice-42",
    created_at: "2026-05-28T12:00:00.000Z",
    updated_at: "2026-05-28T12:00:00.000Z",
    created_by: "operator@example.com",
    updated_by: "operator@example.com",
  },
  audit_event_id: "audit-1",
  outbox_event_id: "outbox-1",
  actor_principal_id: "principal-operator",
  actor_subject: "operator@example.com",
  reason: "Grant billing access",
  correlation_id: "binding-1",
  reference_type: "application",
  reference_id: "application-1",
  occurred_at: "2026-05-28T12:00:00.000Z",
});

test("PostgresRoleBindingRepository persists approval-required role bindings as eligible", async () => {
  const client = new RecordingTransactionClient(null, {
    3: [{ role_definition_id: "role-1", approval_required: true }],
    4: [{ principal_id: "principal-1" }],
    5: [{ application_id: "application-1" }],
  });
  const repository = new PostgresRoleBindingRepository(new RecordingTransactionPool(client));

  const persistedRoleBinding = await repository.createRoleBinding(createInput());

  assert.equal(persistedRoleBinding.role_binding_status, "eligible");

  const insertCall = client.calls.find((call) => call.queryText.includes("INSERT INTO role_binding"));

  assert.notEqual(insertCall, undefined);
  assert.equal(insertCall?.values[3], "eligible");

  const auditCall = client.calls.find((call) => call.queryText.includes("INSERT INTO audit_event"));

  assert.notEqual(auditCall, undefined);
  assert.match(String(auditCall?.values[9]), /"role_binding_status":"eligible"/);
});

test("PostgresRoleBindingRepository writes binding, audit, and outbox rows in one transaction", async () => {
  const client = new RecordingTransactionClient(null, {
    3: [{ role_definition_id: "role-1", approval_required: false }],
    4: [{ principal_id: "principal-1" }],
    5: [{ application_id: "application-1" }],
  });
  const repository = new PostgresRoleBindingRepository(new RecordingTransactionPool(client));

  await repository.createRoleBinding(createInput());

  assert.equal(client.calls.length, 10);
  assert.equal(client.calls[0]?.queryText, "BEGIN");
  assert.match(client.calls[1]?.queryText ?? "", /pg_advisory_xact_lock/i);
  assert.match(client.calls[2]?.queryText ?? "", /FROM role_definition/i);
  assert.match(client.calls[3]?.queryText ?? "", /FROM principal/i);
  assert.match(client.calls[4]?.queryText ?? "", /FROM application/i);
  assert.match(client.calls[5]?.queryText ?? "", /FROM role_toxic_combination/i);
  assert.match(client.calls[6]?.queryText ?? "", /INSERT INTO role_binding/i);
  assert.match(client.calls[7]?.queryText ?? "", /INSERT INTO audit_event/i);
  assert.match(client.calls[8]?.queryText ?? "", /INSERT INTO outbox_event/i);
  assert.equal(client.calls[9]?.queryText, "COMMIT");
  assert.equal(client.released, true);
});

test("PostgresRoleBindingRepository rolls back and maps missing role definitions to a deterministic error", async () => {
  const client = new RecordingTransactionClient();
  const repository = new PostgresRoleBindingRepository(new RecordingTransactionPool(client));

  await assert.rejects(repository.createRoleBinding(createInput()), (error: unknown) => {
    assert.ok(error instanceof CreateRoleBindingError);
    assert.equal(error.code, "ROLE_BINDING_ROLE_DEFINITION_NOT_FOUND");
    assert.equal(error.statusCode, 404);
    return true;
  });

  assert.equal(client.calls.length, 4);
  assert.equal(client.calls[0]?.queryText, "BEGIN");
  assert.match(client.calls[1]?.queryText ?? "", /pg_advisory_xact_lock/i);
  assert.match(client.calls[2]?.queryText ?? "", /FROM role_definition/i);
  assert.equal(client.calls[3]?.queryText, "ROLLBACK");
  assert.equal(client.released, true);
});

test("PostgresRoleBindingRepository blocks toxic role combinations for the same subject at overlapping scope", async () => {
  const client = new RecordingTransactionClient(null, {
    3: [{ role_definition_id: "role-1", approval_required: false }],
    4: [{ principal_id: "principal-1" }],
    5: [{ application_id: "application-1" }],
    6: [
      {
        role_binding_id: "binding-existing",
        role_definition_id: "role-2",
        conflict_reason: "Finance approvers cannot also request vendor payments.",
      },
    ],
  });
  const repository = new PostgresRoleBindingRepository(new RecordingTransactionPool(client));

  await assert.rejects(repository.createRoleBinding(createInput()), (error: unknown) => {
    assert.ok(error instanceof CreateRoleBindingError);
    assert.equal(error.code, "ROLE_BINDING_SOD_CONFLICT");
    assert.equal(error.statusCode, 409);
    assert.match(
      error.message,
      /blocked by a toxic role combination with existing role binding binding-existing/i,
    );
    return true;
  });

  assert.equal(client.calls.length, 7);
  assert.equal(client.calls[0]?.queryText, "BEGIN");
  assert.match(client.calls[1]?.queryText ?? "", /pg_advisory_xact_lock/i);
  assert.match(client.calls[2]?.queryText ?? "", /FROM role_definition/i);
  assert.match(client.calls[3]?.queryText ?? "", /FROM principal/i);
  assert.match(client.calls[4]?.queryText ?? "", /FROM application/i);
  assert.match(client.calls[5]?.queryText ?? "", /FROM role_toxic_combination/i);
  assert.equal(client.calls[6]?.queryText, "ROLLBACK");
  assert.equal(client.released, true);
});

test("PostgresRoleBindingRepository updates role binding status and writes audit and outbox rows in one transaction", async () => {
  const client = new RecordingTransactionClient(null, {
    2: [{
      role_binding_id: "binding-1",
      tenant_id: "tenant-1",
      role_definition_id: "role-1",
      role_binding_status: "eligible",
      subject_principal_id: "principal-1",
      subject_group_id: null,
      scope_type: "application",
      scope_application_id: "application-1",
      scope_resource_type: null,
      scope_resource_id: null,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z",
      created_by: "operator@example.com",
      updated_by: "operator@example.com",
    }],
  });
  const repository = new PostgresRoleBindingRepository(new RecordingTransactionPool(client));

  const updatedRoleBinding = await repository.updateRoleBindingStatus({
    tenant_id: "tenant-1",
    role_binding_id: "binding-1",
    role_binding_status: "active",
    audit_event_id: "audit-1",
    outbox_event_id: "outbox-1",
    actor_principal_id: "principal-operator",
    actor_subject: "approver@example.com",
    reason: "Approve privileged assignment",
    correlation_id: "binding-1",
    occurred_at: "2026-05-28T12:00:00.000Z",
  });

  assert.equal(updatedRoleBinding.role_binding_status, "active");
  assert.equal(updatedRoleBinding.updated_by, "approver@example.com");
  assert.equal(client.calls.length, 6);
  assert.equal(client.calls[0]?.queryText, "BEGIN");
  assert.match(client.calls[1]?.queryText ?? "", /FROM role_binding/i);
  assert.match(client.calls[2]?.queryText ?? "", /UPDATE role_binding/i);
  assert.match(client.calls[3]?.queryText ?? "", /INSERT INTO audit_event/i);
  assert.match(client.calls[4]?.queryText ?? "", /INSERT INTO outbox_event/i);
  assert.equal(client.calls[5]?.queryText, "COMMIT");
  assert.equal(client.released, true);
});

test("PostgresRoleBindingRepository rolls back and maps missing role bindings on status update", async () => {
  const client = new RecordingTransactionClient();
  const repository = new PostgresRoleBindingRepository(new RecordingTransactionPool(client));

  await assert.rejects(
    repository.updateRoleBindingStatus({
      tenant_id: "tenant-1",
      role_binding_id: "binding-missing",
      role_binding_status: "active",
      audit_event_id: "audit-1",
      outbox_event_id: "outbox-1",
      actor_principal_id: null,
      actor_subject: "approver@example.com",
      reason: "Approve privileged assignment",
      correlation_id: "binding-missing",
      occurred_at: "2026-05-28T12:00:00.000Z",
    }),
    (error: unknown) => {
      assert.ok(error instanceof UpdateRoleBindingStatusError);
      assert.equal(error.code, "ROLE_BINDING_NOT_FOUND");
      assert.equal(error.statusCode, 404);
      return true;
    },
  );

  assert.equal(client.calls.length, 3);
  assert.equal(client.calls[0]?.queryText, "BEGIN");
  assert.match(client.calls[1]?.queryText ?? "", /FROM role_binding/i);
  assert.equal(client.calls[2]?.queryText, "ROLLBACK");
  assert.equal(client.released, true);
});