import type { Clock } from "./session-types.js";
import type { OperationalTelemetryRecorder } from "./operational-telemetry-types.js";

export type IdentityReconciliationAnomalyCode =
  | "ORPHANED_PRINCIPAL"
  | "DUPLICATE_SUBJECT_MAPPING"
  | "SUSPENDED_PRINCIPAL_ACTIVE_MEMBERSHIP";

export interface IdentityReconciliationAnomaly {
  code: IdentityReconciliationAnomalyCode;
  principal_id: string | null;
  subject: string | null;
  tenant_id: string | null;
  observed_count: number;
}

export interface IdentityReconciliationSnapshot {
  principals_scanned: number;
  tenant_memberships_scanned: number;
  anomalies: IdentityReconciliationAnomaly[];
}

export interface IdentityReconciliationSummary {
  principals_scanned: number;
  tenant_memberships_scanned: number;
  anomalies_detected: number;
  orphaned_principals: number;
  duplicate_subject_mappings: number;
  suspended_principal_active_memberships: number;
}

export interface IdentityReconciliationResponse {
  generated_at: string;
  status: "ok" | "drift_detected";
  summary: IdentityReconciliationSummary;
  anomalies: IdentityReconciliationAnomaly[];
}

export interface IdentityReconciliationRepository {
  scanIdentityReconciliation(): Promise<IdentityReconciliationSnapshot>;
}

export interface RunIdentityReconciliationDependencies {
  identityReconciliationRepository: IdentityReconciliationRepository;
  clock: Clock;
  operationalTelemetry?: OperationalTelemetryRecorder;
}
