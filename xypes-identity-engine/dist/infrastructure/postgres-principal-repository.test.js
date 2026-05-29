import assert from "node:assert/strict";
import test from "node:test";
import { PostgresPrincipalRepository } from "./postgres-principal-repository.js";
class RecordingDatabaseClient {
    rows;
    calls = [];
    constructor(rows) {
        this.rows = rows;
    }
    async query(queryText, values) {
        this.calls.push({ queryText, values });
        return {
            rows: this.rows,
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
    assert.match(databaseClient.calls[0]?.queryText ?? "", /FROM tenant_membership/i);
    assert.deepEqual(databaseClient.calls[0]?.values, ["principal-1", "tenant-1"]);
});
