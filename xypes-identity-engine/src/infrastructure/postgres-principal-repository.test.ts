import assert from "node:assert/strict";
import test from "node:test";

import { PostgresPrincipalRepository } from "./postgres-principal-repository.js";

class RecordingDatabaseClient {
  readonly calls: Array<{ queryText: string; values: readonly unknown[] }> = [];

  constructor(private readonly rows: unknown[]) {}

  async query<Row extends { [key: string]: unknown }>(
    queryText: string,
    values: readonly unknown[],
  ): Promise<{ rows: Row[] }> {
    this.calls.push({ queryText, values });

    return {
      rows: this.rows as Row[],
    };
  }
}

class SequencedRecordingDatabaseClient {
  readonly calls: Array<{ queryText: string; values: readonly unknown[] }> = [];

  constructor(private readonly rowSets: unknown[][]) {}

  async query<Row extends { [key: string]: unknown }>(
    queryText: string,
    values: readonly unknown[],
  ): Promise<{ rows: Row[] }> {
    this.calls.push({ queryText, values });

    return {
      rows: (this.rowSets.shift() ?? []) as Row[],
    };
  }
}

test("PostgresPrincipalRepository returns the matching principal by subject", async () => {
  const databaseClient = new RecordingDatabaseClient([
    {
      principal_id: "principal-1",
      subject: "supabase-user-1",
      email: "user@example.com",
      status: "active",
    },
  ]);
  const repository = new PostgresPrincipalRepository(databaseClient);

  const result = await repository.findBySubject("supabase-user-1");

  assert.deepEqual(result, {
    principal_id: "principal-1",
    subject: "supabase-user-1",
    email: "user@example.com",
    status: "active",
  });
  assert.equal(databaseClient.calls.length, 1);
  assert.match(databaseClient.calls[0]?.queryText ?? "", /FROM principal/i);
  assert.deepEqual(databaseClient.calls[0]?.values, ["supabase-user-1"]);
});

test("PostgresPrincipalRepository returns null when no tenant membership exists", async () => {
  const databaseClient = new RecordingDatabaseClient([]);
  const repository = new PostgresPrincipalRepository(databaseClient);

  const result = await repository.findTenantMembership({
    principalId: "principal-1",
    tenantId: "tenant-1",
  });

  assert.equal(result, null);
  assert.equal(databaseClient.calls.length, 1);
  assert.match(
    databaseClient.calls[0]?.queryText ?? "",
    /FROM tenant_membership/i,
  );
  assert.deepEqual(databaseClient.calls[0]?.values, [
    "principal-1",
    "tenant-1",
  ]);
});

test("PostgresPrincipalRepository scans identity reconciliation anomalies", async () => {
  const databaseClient = new SequencedRecordingDatabaseClient([
    [{ total: "3" }],
    [{ total: "2" }],
    [
      {
        code: "ORPHANED_PRINCIPAL",
        principal_id: "principal-2",
        subject: "supabase-user-2",
        tenant_id: null,
        observed_count: "1",
      },
      {
        code: "SUSPENDED_PRINCIPAL_ACTIVE_MEMBERSHIP",
        principal_id: "principal-3",
        subject: "supabase-user-3",
        tenant_id: "tenant-1",
        observed_count: "1",
      },
    ],
  ]);
  const repository = new PostgresPrincipalRepository(databaseClient);

  const result = await repository.scanIdentityReconciliation();

  assert.deepEqual(result, {
    principals_scanned: 3,
    tenant_memberships_scanned: 2,
    anomalies: [
      {
        code: "ORPHANED_PRINCIPAL",
        principal_id: "principal-2",
        subject: "supabase-user-2",
        tenant_id: null,
        observed_count: 1,
      },
      {
        code: "SUSPENDED_PRINCIPAL_ACTIVE_MEMBERSHIP",
        principal_id: "principal-3",
        subject: "supabase-user-3",
        tenant_id: "tenant-1",
        observed_count: 1,
      },
    ],
  });
  assert.equal(databaseClient.calls.length, 3);
  assert.match(databaseClient.calls[2]?.queryText ?? "", /ORPHANED_PRINCIPAL/i);
});
