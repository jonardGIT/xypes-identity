const toStatus = (ready) => ready ? "healthy" : "attention";
export const buildOperationsDiagnostics = (snapshot) => ({
    generated_at: snapshot.generated_at,
    summary: {
        token_validation_failures: snapshot.resolve_session.token_failure_count,
        identity_availability_failures: snapshot.resolve_session.availability_failure_count,
        tenant_access_failures: snapshot.resolve_session.tenant_access_failure_count,
        average_authorize_check_duration_ms: snapshot.authorization.average_check_duration_ms,
        average_authorize_explain_duration_ms: snapshot.authorization.average_explain_duration_ms,
        replay_batches_with_failures_total: snapshot.replay.batches_with_failures_total,
        identity_lifecycle_status: snapshot.identity_lifecycle.status,
    },
    sections: [
        {
            key: "token_validation_failures",
            title: "Token Validation Failures",
            items: [
                {
                    label: "invalid_or_expired_tokens",
                    value: snapshot.resolve_session.token_failure_count,
                    status: snapshot.resolve_session.token_failure_count > 0 ? "warning" : "healthy",
                },
                {
                    label: "jwks_or_verification_failures",
                    value: snapshot.resolve_session.availability_failure_count,
                    status: snapshot.resolve_session.availability_failure_count > 0 ? "attention" : "healthy",
                },
                {
                    label: "tenant_access_failures",
                    value: snapshot.resolve_session.tenant_access_failure_count,
                    status: snapshot.resolve_session.tenant_access_failure_count > 0 ? "warning" : "healthy",
                },
                {
                    label: "last_error_code",
                    value: snapshot.resolve_session.last_error_code ?? "none",
                    status: snapshot.resolve_session.last_error_code === null ? "healthy" : "warning",
                },
            ],
        },
        {
            key: "authorization_latency",
            title: "Authorization Latency",
            items: [
                {
                    label: "average_authorize_check_duration_ms",
                    value: snapshot.authorization.average_check_duration_ms,
                    status: snapshot.authorization.average_check_duration_ms > 50 ? "attention" : "healthy",
                },
                {
                    label: "average_authorize_explain_duration_ms",
                    value: snapshot.authorization.average_explain_duration_ms,
                    status: snapshot.authorization.average_explain_duration_ms > 100 ? "attention" : "healthy",
                },
                {
                    label: "decision_cache_hit_count",
                    value: snapshot.authorization.decision_cache_hit_count,
                    status: snapshot.authorization.decision_cache_hit_count > 0 ? "healthy" : "warning",
                },
                {
                    label: "expansion_cache_hit_count",
                    value: snapshot.authorization.expansion_cache_hit_count,
                    status: snapshot.authorization.expansion_cache_hit_count > 0 ? "healthy" : "warning",
                },
            ],
        },
        {
            key: "rollout_diagnostics",
            title: "Rollout Diagnostics",
            items: [
                {
                    label: "bridge_failure_visibility_ready",
                    value: snapshot.rollout_diagnostics.bridge_failure_visibility_ready,
                    status: toStatus(snapshot.rollout_diagnostics.bridge_failure_visibility_ready),
                },
                {
                    label: "decision_latency_visibility_ready",
                    value: snapshot.rollout_diagnostics.decision_latency_visibility_ready,
                    status: toStatus(snapshot.rollout_diagnostics.decision_latency_visibility_ready),
                },
                {
                    label: "replay_visibility_ready",
                    value: snapshot.rollout_diagnostics.replay_visibility_ready,
                    status: toStatus(snapshot.rollout_diagnostics.replay_visibility_ready),
                },
                {
                    label: "identity_lifecycle_visibility_ready",
                    value: snapshot.rollout_diagnostics.identity_lifecycle_visibility_ready,
                    status: snapshot.rollout_diagnostics.identity_lifecycle_visibility_ready ? "healthy" : "inactive",
                },
            ],
        },
    ],
});
