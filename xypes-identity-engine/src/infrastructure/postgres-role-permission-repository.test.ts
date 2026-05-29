import assert from "node:assert/strict";
import test from "node:test";

import { AttachRolePermissionError } from "../domain/role-permission-errors.js";
import { PostgresRolePermissionRepository } from "./postgres-role-permission-repository.js";

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
  role_permission: {
    role_permission_id: "role-permission-1",
    tenant_id: "tenant-1",
    role_definition_id: "role-1",
    permission_id: "permission-1",
    created_at: "2026-05-28T12:00:00.000Z",
    updated_at: "2026-05-28T12:00:00.000Z",
    created_by: "operator@example.com",
    updated_by: "operator@example.com",
  },
  audit_event_id: "audit-1",
  outbox_event_id: "outbox-1",
  actor_principal_id: "principal-1",
  actor_subject: "operator@example.com",
  reason: "Attach permission to role",
  correlation_id: "role-permission-1",
  reference_type: "role_definition",
  reference_id: "role-1",
  occurred_at: "2026-05-28T12:00:00.000Z",
});

test("PostgresRolePermissionRepository writes role-permission, audit, and outbox rows in one transaction", async () => {
  const client = new RecordingTransactionClient(null, {
    2: [{ role_definition_id: "role-1" }],
    3: [{ permission_id: "permission-1" }],
  });
  const repository = new PostgresRolePermissionRepository(new RecordingTransactionPool(client));

  await repository.attachRolePermission(createInput());

  assert.equal(client.calls.length, 7);
  assert.equal(client.calls[0]?.queryText, "BEGIN");
  assert.match(client.calls[1]?.queryText ?? "", /FROM role_definition/i);
  assert.match(client.calls[2]?.queryText ?? "", /FROM permission/i);
  assert.match(client.calls[3]?.queryText ?? "", /INSERT INTO role_permission/i);
  assert.match(client.calls[4]?.queryText ?? "", /INSERT INTO audit_event/i);
  assert.match(client.calls[5]?.queryText ?? "", /INSERT INTO outbox_event/i);
  assert.equal(client.calls[6]?.queryText, "COMMIT");
  assert.equal(client.released, true);
});

test("PostgresRolePermissionRepository rolls back when the role definition does not exist", async () => {
  const client = new RecordingTransactionClient();
  const repository = new PostgresRolePermissionRepository(new RecordingTransactionPool(client));

  await assert.rejects(repository.attachRolePermission(createInput()), (error: unknown) => {
    assert.ok(error instanceof AttachRolePermissionError);
    assert.equal(error.code, "ROLE_PERMISSION_ROLE_DEFINITION_NOT_FOUND");
    assert.equal(error.statusCode, 404);
    return true;
  });

  assert.equal(client.calls.length, 3);
  assert.equal(client.calls[0]?.queryText, "BEGIN");
  assert.match(client.calls[1]?.queryText ?? "", /FROM role_definition/i);
  assert.equal(client.calls[2]?.queryText, "ROLLBACK");
  assert.equal(client.released, true);
});

test("PostgresRolePermissionRepository rolls back when the permission does not exist", async () => {
  const client = new RecordingTransactionClient(null, {
    2: [{ role_definition_id: "role-1" }],
  });
  const repository = new PostgresRolePermissionRepository(new RecordingTransactionPool(client));

  await assert.rejects(repository.attachRolePermission(createInput()), (error: unknown) => {
    assert.ok(error instanceof AttachRolePermissionError);
    assert.equal(error.code, "ROLE_PERMISSION_PERMISSION_NOT_FOUND");
    assert.equal(error.statusCode, 404);
    return true;
  });

  assert.equal(client.calls.length, 4);
  assert.equal(client.calls[0]?.queryText, "BEGIN");
  assert.match(client.calls[1]?.queryText ?? "", /FROM role_definition/i);
  assert.match(client.calls[2]?.queryText ?? "", /FROM permission/i);
  assert.equal(client.calls[3]?.queryText, "ROLLBACK");
  assert.equal(client.released, true);
});

test("PostgresRolePermissionRepository rolls back and maps duplicate attachments to a deterministic error", async () => {
  const duplicateAttachmentError = Object.assign(new Error("duplicate key value"), {
    code: "23505",
    constraint: "role_permission_tenant_id_role_definition_id_permission_id_key",
  });
  const client = new RecordingTransactionClient(
    {
      atCall: 4,
      error: duplicateAttachmentError,
    },
    {
      2: [{ role_definition_id: "role-1" }],
      3: [{ permission_id: "permission-1" }],
    },
  );
  const repository = new PostgresRolePermissionRepository(new RecordingTransactionPool(client));

  await assert.rejects(repository.attachRolePermission(createInput()), (error: unknown) => {
    assert.ok(error instanceof AttachRolePermissionError);
    assert.equal(error.code, "ROLE_PERMISSION_DUPLICATE");
    assert.equal(error.statusCode, 409);
    return true;
  });

  assert.equal(client.calls.length, 5);
  assert.equal(client.calls[0]?.queryText, "BEGIN");
  assert.match(client.calls[1]?.queryText ?? "", /FROM role_definition/i);
  assert.match(client.calls[2]?.queryText ?? "", /FROM permission/i);
  assert.match(client.calls[3]?.queryText ?? "", /INSERT INTO role_permission/i);
  assert.equal(client.calls[4]?.queryText, "ROLLBACK");
  assert.equal(client.released, true);
});