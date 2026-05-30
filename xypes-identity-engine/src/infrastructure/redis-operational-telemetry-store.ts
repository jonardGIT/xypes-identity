import type { OperationalTelemetrySnapshot } from "@xypes-identity/shared";

import type {
  AuthorizationTelemetryInput,
  IdentityReconciliationTelemetryInput,
  OperationalTelemetryRecorder,
  ReplayTelemetryInput,
  ResolveSessionTelemetryInput,
} from "../domain/operational-telemetry-types.js";

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
}

interface MutableTelemetryState {
  resolve_session: OperationalTelemetrySnapshot["resolve_session"];
  authorization: OperationalTelemetrySnapshot["authorization"];
  replay: OperationalTelemetrySnapshot["replay"];
  identity_lifecycle: OperationalTelemetrySnapshot["identity_lifecycle"];
}

const telemetryKey = "operations:telemetry:snapshot";

const createInitialState = (): MutableTelemetryState => ({
  resolve_session: {
    total_requests: 0,
    success_count: 0,
    failure_count: 0,
    token_failure_count: 0,
    availability_failure_count: 0,
    tenant_access_failure_count: 0,
    average_duration_ms: 0,
    last_duration_ms: null,
    last_error_code: null,
    last_resolved_at: null,
    last_failed_at: null,
  },
  authorization: {
    authorize_check_total: 0,
    authorize_explain_total: 0,
    decision_cache_hit_count: 0,
    decision_cache_miss_count: 0,
    expansion_cache_hit_count: 0,
    expansion_cache_miss_count: 0,
    average_check_duration_ms: 0,
    average_explain_duration_ms: 0,
    last_check_duration_ms: null,
    last_explain_duration_ms: null,
    last_decision_at: null,
  },
  replay: {
    batches_processed_total: 0,
    batches_with_failures_total: 0,
    events_claimed_total: 0,
    events_published_total: 0,
    events_failed_total: 0,
    average_batch_duration_ms: 0,
    last_batch_duration_ms: null,
    last_batch_completed_at: null,
  },
  identity_lifecycle: {
    status: "not_configured",
    webhook_events_processed_total: 0,
    webhook_failures_total: 0,
    reconciliation_runs_total: 0,
    reconciliation_anomalies_total: 0,
    last_webhook_at: null,
    last_reconciliation_at: null,
    notes: "Webhook ingestion and reconciliation telemetry are reserved here, but the runtime path is not implemented in this repo yet.",
  },
});

const parseState = (value: string | null): MutableTelemetryState => {
  if (value === null) {
    return createInitialState();
  }

  return JSON.parse(value) as MutableTelemetryState;
};

const updateAverage = (currentAverage: number, currentCount: number, durationMs: number): number => {
  const nextCount = currentCount + 1;

  return ((currentAverage * currentCount) + durationMs) / nextCount;
};

export class RedisOperationalTelemetryStore implements OperationalTelemetryRecorder {
  constructor(private readonly redisClient: RedisClient) {}

  private async mutate(mutateState: (state: MutableTelemetryState) => void): Promise<void> {
    const current = parseState(await this.redisClient.get(telemetryKey));
    mutateState(current);
    await this.redisClient.set(telemetryKey, JSON.stringify(current));
  }

  async recordResolveSession(input: ResolveSessionTelemetryInput): Promise<void> {
    await this.mutate((state) => {
      const snapshot = state.resolve_session;

      snapshot.total_requests += 1;
      snapshot.last_duration_ms = input.duration_ms;
      snapshot.average_duration_ms = updateAverage(
        snapshot.average_duration_ms,
        snapshot.total_requests - 1,
        input.duration_ms,
      );

      if (input.outcome === "success") {
        snapshot.success_count += 1;
        snapshot.last_resolved_at = input.occurred_at;
        snapshot.last_error_code = null;
        return;
      }

      snapshot.failure_count += 1;
      snapshot.last_failed_at = input.occurred_at;
      snapshot.last_error_code = input.error_code ?? null;

      if (input.error_code === "AUTH_INVALID_TOKEN" || input.error_code === "AUTH_TOKEN_EXPIRED") {
        snapshot.token_failure_count += 1;
      } else if (
        input.error_code === "AUTH_JWKS_UNAVAILABLE"
        || input.error_code === "AUTH_TOKEN_VERIFICATION_UNAVAILABLE"
      ) {
        snapshot.availability_failure_count += 1;
      } else if (input.error_code !== undefined) {
        snapshot.tenant_access_failure_count += 1;
      }
    });
  }

  async recordAuthorization(input: AuthorizationTelemetryInput): Promise<void> {
    await this.mutate((state) => {
      const snapshot = state.authorization;
      const isCheck = input.operation === "authorize.check";

      if (isCheck) {
        snapshot.authorize_check_total += 1;
        snapshot.last_check_duration_ms = input.duration_ms;
        snapshot.average_check_duration_ms = updateAverage(
          snapshot.average_check_duration_ms,
          snapshot.authorize_check_total - 1,
          input.duration_ms,
        );
      } else {
        snapshot.authorize_explain_total += 1;
        snapshot.last_explain_duration_ms = input.duration_ms;
        snapshot.average_explain_duration_ms = updateAverage(
          snapshot.average_explain_duration_ms,
          snapshot.authorize_explain_total - 1,
          input.duration_ms,
        );
      }

      snapshot.last_decision_at = input.occurred_at;

      if (input.decision_cache_status === "hit") {
        snapshot.decision_cache_hit_count += 1;
      } else if (input.decision_cache_status === "miss") {
        snapshot.decision_cache_miss_count += 1;
      }

      if (input.expansion_cache_status === "hit") {
        snapshot.expansion_cache_hit_count += 1;
      } else if (input.expansion_cache_status === "miss") {
        snapshot.expansion_cache_miss_count += 1;
      }
    });
  }

  async recordReplayBatch(input: ReplayTelemetryInput): Promise<void> {
    await this.mutate((state) => {
      const snapshot = state.replay;

      snapshot.batches_processed_total += 1;
      snapshot.events_claimed_total += input.claimed_count;
      snapshot.events_published_total += input.published_count;
      snapshot.events_failed_total += input.failed_count;
      snapshot.last_batch_duration_ms = input.duration_ms;
      snapshot.last_batch_completed_at = input.completed_at;
      snapshot.average_batch_duration_ms = updateAverage(
        snapshot.average_batch_duration_ms,
        snapshot.batches_processed_total - 1,
        input.duration_ms,
      );

      if (input.failed_count > 0) {
        snapshot.batches_with_failures_total += 1;
      }
    });
  }

  async recordIdentityReconciliation(
    input: IdentityReconciliationTelemetryInput,
  ): Promise<void> {
    await this.mutate((state) => {
      const snapshot = state.identity_lifecycle;

      snapshot.status = "active";
      snapshot.reconciliation_runs_total += 1;
      snapshot.reconciliation_anomalies_total += input.anomaly_count;
      snapshot.last_reconciliation_at = input.occurred_at;
      snapshot.notes = input.notes;
    });
  }

  async getSnapshot(generatedAt: string): Promise<OperationalTelemetrySnapshot> {
    const state = parseState(await this.redisClient.get(telemetryKey));

    return {
      generated_at: generatedAt,
      ...state,
      rollout_diagnostics: {
        bridge_failure_visibility_ready:
          state.resolve_session.token_failure_count > 0
          || state.resolve_session.availability_failure_count > 0,
        decision_latency_visibility_ready:
          state.authorization.authorize_check_total > 0
          || state.authorization.authorize_explain_total > 0,
        replay_visibility_ready: state.replay.batches_processed_total > 0,
        identity_lifecycle_visibility_ready: state.identity_lifecycle.status === "active",
      },
    };
  }
}