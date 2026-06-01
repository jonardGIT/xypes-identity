import type {
  IdentityReconciliationAnomaly,
  IdentityReconciliationResponse,
  RunIdentityReconciliationDependencies,
} from "../domain/identity-reconciliation-types.js";

const countAnomalies = (
  anomalies: IdentityReconciliationAnomaly[],
  code: IdentityReconciliationAnomaly["code"],
): number => anomalies.filter((entry) => entry.code === code).length;

export const runIdentityReconciliation = async (
  dependencies: RunIdentityReconciliationDependencies,
): Promise<IdentityReconciliationResponse> => {
  const generatedAt = dependencies.clock.now().toISOString();
  const snapshot =
    await dependencies.identityReconciliationRepository.scanIdentityReconciliation();
  const anomalyCount = snapshot.anomalies.length;

  await dependencies.operationalTelemetry?.recordIdentityReconciliation({
    occurred_at: generatedAt,
    anomaly_count: anomalyCount,
    notes:
      anomalyCount === 0
        ? "Identity reconciliation completed without drift anomalies."
        : `Identity reconciliation detected ${anomalyCount} drift anomaly${anomalyCount === 1 ? "" : "ies"}.`,
  });

  return {
    generated_at: generatedAt,
    status: anomalyCount === 0 ? "ok" : "drift_detected",
    summary: {
      principals_scanned: snapshot.principals_scanned,
      tenant_memberships_scanned: snapshot.tenant_memberships_scanned,
      anomalies_detected: anomalyCount,
      orphaned_principals: countAnomalies(
        snapshot.anomalies,
        "ORPHANED_PRINCIPAL",
      ),
      duplicate_subject_mappings: countAnomalies(
        snapshot.anomalies,
        "DUPLICATE_SUBJECT_MAPPING",
      ),
      suspended_principal_active_memberships: countAnomalies(
        snapshot.anomalies,
        "SUSPENDED_PRINCIPAL_ACTIVE_MEMBERSHIP",
      ),
    },
    anomalies: snapshot.anomalies,
  };
};
