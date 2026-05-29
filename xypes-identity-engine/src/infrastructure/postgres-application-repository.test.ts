import assert from "node:assert/strict";
import test from "node:test";

import { CreateApplicationError } from "../domain/application-errors.js";
import { PostgresApplicationRepository } from "./postgres-application-repository.js";

class RecordingTransactionClient {
  readonly calls: Array<{ queryText: string; values: readonly unknown[] }> = [];
  released = false;

  constructor(private readonly failure: { atCall: number; error: Error } | null = null) {}

  async query<Row extends { [key: string]: unknown }>(
    queryText: string,
    values: readonly unknown[],
  ): Promise<{ rows: Row[] }> {
    this.calls.push({ queryText, values });

    if (this.failure !== null && this.calls.length === this.failure.atCall) {
      throw this.failure.error;
    }

    return { rows: [] };
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
  application: {
    application_id: "application-1",
    tenant_id: "tenant-1",
    slug: "billing",
    display_name: "Billing",
    status: "active" as const,
    created_at: "2026-05-28T12:00:00.000Z",
    updated_at: "2026-05-28T12:00:00.000Z",
    created_by: "operator@example.com",
    updated_by: "operator@example.com",
  },
  audit_event_id: "audit-1",
  outbox_event_id: "outbox-1",
  actor_principal_id: "principal-1",
  actor_subject: "operator@example.com",
  reason: "Bootstrap application catalog",
  correlation_id: "application-1",
  reference_type: "tenant",
  reference_id: "tenant-1",
  occurred_at: "2026-05-28T12:00:00.000Z",
});

test("PostgresApplicationRepository writes application, audit, and outbox rows in one transaction", async () => {
  const client = new RecordingTransactionClient();
  const repository = new PostgresApplicationRepository(new RecordingTransactionPool(client));

  await repository.createApplication(createInput());

  assert.equal(client.calls.length, 5);
  assert.equal(client.calls[0]?.queryText, "BEGIN");
  assert.match(client.calls[1]?.queryText ?? "", /INSERT INTO application/i);
  assert.match(client.calls[2]?.queryText ?? "", /INSERT INTO audit_event/i);
  assert.match(client.calls[3]?.queryText ?? "", /INSERT INTO outbox_event/i);
  assert.equal(client.calls[4]?.queryText, "COMMIT");
  assert.equal(client.released, true);
});

test("PostgresApplicationRepository rolls back and maps duplicate tenant slugs to a deterministic error", async () => {
  const duplicateSlugError = Object.assign(new Error("duplicate key value"), {
    code: "23505",
    constraint: "application_tenant_id_slug_key",
  });
  const client = new RecordingTransactionClient({
    atCall: 2,
    error: duplicateSlugError,
  });
  const repository = new PostgresApplicationRepository(new RecordingTransactionPool(client));

  await assert.rejects(repository.createApplication(createInput()), (error: unknown) => {
    assert.ok(error instanceof CreateApplicationError);
    assert.equal(error.code, "APPLICATION_DUPLICATE_TENANT_SLUG");
    assert.equal(error.statusCode, 409);
    return true;
  });

  assert.equal(client.calls.length, 3);
  assert.equal(client.calls[0]?.queryText, "BEGIN");
  assert.match(client.calls[1]?.queryText ?? "", /INSERT INTO application/i);
  assert.equal(client.calls[2]?.queryText, "ROLLBACK");
  assert.equal(client.released, true);
});