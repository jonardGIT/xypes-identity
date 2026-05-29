export type IdentityLifecycleVisibilityStatus = "not_configured" | "active";

export interface ResolveSessionTelemetrySnapshot {
  total_requests: number;
  success_count: number;
  failure_count: number;
  token_failure_count: number;
  availability_failure_count: number;
  tenant_access_failure_count: number;
  average_duration_ms: number;
  last_duration_ms: number | null;
  last_error_code: string | null;
  last_resolved_at: string | null;
  last_failed_at: string | null;
}

export interface AuthorizationTelemetrySnapshot {
  authorize_check_total: number;
  authorize_explain_total: number;
  decision_cache_hit_count: number;
  decision_cache_miss_count: number;
  expansion_cache_hit_count: number;
  expansion_cache_miss_count: number;
  average_check_duration_ms: number;
  average_explain_duration_ms: number;
  last_check_duration_ms: number | null;
  last_explain_duration_ms: number | null;
  last_decision_at: string | null;
}

export interface ReplayTelemetrySnapshot {
  batches_processed_total: number;
  batches_with_failures_total: number;
  events_claimed_total: number;
  events_published_total: number;
  events_failed_total: number;
  average_batch_duration_ms: number;
  last_batch_duration_ms: number | null;
  last_batch_completed_at: string | null;
}

export interface IdentityLifecycleVisibilitySnapshot {
  status: IdentityLifecycleVisibilityStatus;
  webhook_events_processed_total: number;
  webhook_failures_total: number;
  reconciliation_runs_total: number;
  reconciliation_anomalies_total: number;
  last_webhook_at: string | null;
  last_reconciliation_at: string | null;
  notes: string | null;
}

export interface RolloutDiagnosticsSnapshot {
  bridge_failure_visibility_ready: boolean;
  decision_latency_visibility_ready: boolean;
  replay_visibility_ready: boolean;
  identity_lifecycle_visibility_ready: boolean;
}

export interface OperationalTelemetrySnapshot {
  generated_at: string;
  resolve_session: ResolveSessionTelemetrySnapshot;
  authorization: AuthorizationTelemetrySnapshot;
  replay: ReplayTelemetrySnapshot;
  identity_lifecycle: IdentityLifecycleVisibilitySnapshot;
  rollout_diagnostics: RolloutDiagnosticsSnapshot;
}