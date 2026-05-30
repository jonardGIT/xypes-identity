import assert from "node:assert/strict";
import test from "node:test";

import type { RunIdentityReconciliationDependencies } from "../domain/identity-reconciliation-types.js";
import type {
  IdentityReconciliationTelemetryInput,
  OperationalTelemetryRecorder,
} from "../domain/operational-telemetry-types.js";
import { runIdentityReconciliation } from "./run-identity-reconciliation.js";

class RecordingOperationalTelemetry implements OperationalTelemetryRecorder {
  reconciliationInputs: IdentityReconciliationTelemetryInput[] = [];

  async recordResolveSession() {}

  async recordAuthorization() {}

  async recordReplayBatch() {}

  async recordIdentityReconciliation(input: IdentityReconciliationTelemetryInput) {
    this.reconciliationInputs.push(input);
  }

  async getSnapshot(): Promise<never> {
    throw new Error("unused in this test");
  }
}

const buildDependencies = (
  operationalTelemetry?: OperationalTelemetryRecorder,
): RunIdentityReconciliationDependencies => ({
  identityReconciliationRepository: {
    async scanIdentityReconciliation() {
      return {
        principals_scanned: 5,
        tenant_memberships_scanned: 4,
        anomalies: [
          {
            code: "ORPHANED_PRINCIPAL" as const,
            principal_id: "principal-7",
            subject: "supabase-user-7",
            tenant_id: null,
            observed_count: 1,
          },
          {
            code: "SUSPENDED_PRINCIPAL_ACTIVE_MEMBERSHIP" as const,
            principal_id: "principal-8",
            subject: "supabase-user-8",
            tenant_id: "tenant-2",
            observed_count: 1,
          },
        ],
      };
    },
  },
  clock: {
    now: () => new Date("2026-05-30T00:00:00.000Z"),
  },
  operationalTelemetry,
});

test("runIdentityReconciliation returns a drift summary and records telemetry", async () => {
  const operationalTelemetry = new RecordingOperationalTelemetry();

  const result = await runIdentityReconciliation(buildDependencies(operationalTelemetry));

  assert.equal(result.generated_at, "2026-05-30T00:00:00.000Z");
  assert.equal(result.status, "drift_detected");
  assert.deepEqual(result.summary, {
    principals_scanned: 5,
    tenant_memberships_scanned: 4,
    anomalies_detected: 2,
    orphaned_principals: 1,
    duplicate_subject_mappings: 0,
    suspended_principal_active_memberships: 1,
  });
  assert.equal(operationalTelemetry.reconciliationInputs.length, 1);
  assert.equal(operationalTelemetry.reconciliationInputs[0]?.anomaly_count, 2);
});