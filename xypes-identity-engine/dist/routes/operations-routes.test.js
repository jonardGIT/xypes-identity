import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../app.js";
class StaticOperationalTelemetry {
    async recordResolveSession() { }
    async recordAuthorization() { }
    async recordReplayBatch() { }
    async getSnapshot(generatedAt) {
        return {
            generated_at: generatedAt,
            resolve_session: {
                total_requests: 5,
                success_count: 3,
                failure_count: 2,
                token_failure_count: 1,
                availability_failure_count: 1,
                tenant_access_failure_count: 0,
                average_duration_ms: 12,
                last_duration_ms: 10,
                last_error_code: "AUTH_JWKS_UNAVAILABLE",
                last_resolved_at: "2026-05-29T00:00:00.000Z",
                last_failed_at: "2026-05-29T00:01:00.000Z",
            },
            authorization: {
                authorize_check_total: 4,
                authorize_explain_total: 1,
                decision_cache_hit_count: 2,
                decision_cache_miss_count: 1,
                expansion_cache_hit_count: 1,
                expansion_cache_miss_count: 0,
                average_check_duration_ms: 8,
                average_explain_duration_ms: 15,
                last_check_duration_ms: 7,
                last_explain_duration_ms: 15,
                last_decision_at: "2026-05-29T00:02:00.000Z",
            },
            replay: {
                batches_processed_total: 2,
                batches_with_failures_total: 1,
                events_claimed_total: 10,
                events_published_total: 9,
                events_failed_total: 1,
                average_batch_duration_ms: 21,
                last_batch_duration_ms: 25,
                last_batch_completed_at: "2026-05-29T00:03:00.000Z",
            },
            identity_lifecycle: {
                status: "not_configured",
                webhook_events_processed_total: 0,
                webhook_failures_total: 0,
                reconciliation_runs_total: 0,
                reconciliation_anomalies_total: 0,
                last_webhook_at: null,
                last_reconciliation_at: null,
                notes: "not configured",
            },
            rollout_diagnostics: {
                bridge_failure_visibility_ready: true,
                decision_latency_visibility_ready: true,
                replay_visibility_ready: true,
                identity_lifecycle_visibility_ready: false,
            },
        };
    }
}
test("GET /v1/operations/telemetry returns the operational telemetry snapshot", async (t) => {
    const app = await buildApp({
        clock: {
            now: () => new Date("2026-05-29T00:05:00.000Z"),
        },
        operationalTelemetry: new StaticOperationalTelemetry(),
    });
    t.after(async () => {
        await app.close();
    });
    const response = await app.inject({
        method: "GET",
        url: "/v1/operations/telemetry",
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().resolve_session.token_failure_count, 1);
    assert.equal(response.json().replay.batches_processed_total, 2);
});
test("GET /v1/meta/api-reference publishes the shared core auth reference", async (t) => {
    const app = await buildApp({
        clock: {
            now: () => new Date("2026-05-29T00:05:00.000Z"),
        },
    });
    t.after(async () => {
        await app.close();
    });
    const response = await app.inject({
        method: "GET",
        url: "/v1/meta/api-reference",
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().generated_at, "2026-05-29T00:05:00.000Z");
    assert.equal(response.json().endpoints.length, 3);
    assert.equal(response.json().endpoints[0].path, "/v1/auth/resolve-session");
});
