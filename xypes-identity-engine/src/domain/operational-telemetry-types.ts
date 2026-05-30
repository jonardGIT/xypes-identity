import type { OperationalTelemetrySnapshot } from "@xypes-identity/shared";

export type AuthorizationOperation = "authorize.check" | "authorize.explain";
export type AuthorizationCacheStatus = "hit" | "miss" | "disabled" | "not_evaluated";

export interface ResolveSessionTelemetryInput {
  duration_ms: number;
  occurred_at: string;
  outcome: "success" | "failure";
  error_code?: string;
}

export interface AuthorizationTelemetryInput {
  operation: AuthorizationOperation;
  duration_ms: number;
  occurred_at: string;
  decision_cache_status: AuthorizationCacheStatus;
  expansion_cache_status?: AuthorizationCacheStatus;
}

export interface ReplayTelemetryInput {
  duration_ms: number;
  completed_at: string;
  claimed_count: number;
  published_count: number;
  failed_count: number;
}

export interface IdentityReconciliationTelemetryInput {
  occurred_at: string;
  anomaly_count: number;
  notes: string;
}

export interface OperationalTelemetryRecorder {
  recordResolveSession(input: ResolveSessionTelemetryInput): Promise<void>;
  recordAuthorization(input: AuthorizationTelemetryInput): Promise<void>;
  recordReplayBatch(input: ReplayTelemetryInput): Promise<void>;
  recordIdentityReconciliation(input: IdentityReconciliationTelemetryInput): Promise<void>;
  getSnapshot(generatedAt: string): Promise<OperationalTelemetrySnapshot>;
}