import assert from "node:assert/strict";
import test from "node:test";

import type { OperationalTelemetryRecorder } from "../domain/operational-telemetry-types.js";
import { runOutboxWorkerLoop } from "./run-outbox-worker.js";

class RecordingOperationalTelemetry implements OperationalTelemetryRecorder {
  replayInputs: Array<{ claimed_count: number; published_count: number; failed_count: number }> = [];

  async recordResolveSession() {}

  async recordAuthorization() {}

  async recordReplayBatch(input: { claimed_count: number; published_count: number; failed_count: number }) {
    this.replayInputs.push(input);
  }

  async recordIdentityReconciliation() {}

  async getSnapshot(): Promise<never> {
    throw new Error("unused in this test");
  }
}

test("runOutboxWorkerLoop keeps polling until aborted", async () => {
  const abortController = new AbortController();
  const operationalTelemetry = new RecordingOperationalTelemetry();
  let processBatchCalls = 0;
  let sleepCalls = 0;

  await runOutboxWorkerLoop(
    {
      poll_interval_ms: 10,
    },
    {
      processBatch: async () => {
        processBatchCalls += 1;

        if (processBatchCalls === 2) {
          abortController.abort();
        }

        return {
          claimed_count: 0,
          published_count: 0,
          failed_count: 0,
        };
      },
      sleep: async () => {
        sleepCalls += 1;
      },
      signal: abortController.signal,
      logger: {
        info: () => {},
        error: () => {},
      },
      operationalTelemetry,
    },
  );

  assert.equal(processBatchCalls, 2);
  assert.equal(sleepCalls, 1);
  assert.equal(operationalTelemetry.replayInputs.length, 2);
  assert.deepEqual(
    operationalTelemetry.replayInputs.map((entry) => ({
      claimed_count: entry.claimed_count,
      published_count: entry.published_count,
      failed_count: entry.failed_count,
    })),
    [
      { claimed_count: 0, published_count: 0, failed_count: 0 },
      { claimed_count: 0, published_count: 0, failed_count: 0 },
    ],
  );
});

test("runOutboxWorkerLoop logs batch failures and keeps polling", async () => {
  const abortController = new AbortController();
  const loggedErrors: Array<{ error: string; durationMs: number }> = [];
  let processBatchCalls = 0;

  await runOutboxWorkerLoop(
    {
      poll_interval_ms: 10,
    },
    {
      processBatch: async () => {
        processBatchCalls += 1;

        if (processBatchCalls === 1) {
          throw new Error("redis unavailable");
        }

        abortController.abort();

        return {
          claimed_count: 0,
          published_count: 0,
          failed_count: 0,
        };
      },
      sleep: async () => {},
      signal: abortController.signal,
      logger: {
        info: () => {},
        error: (bindings) => {
          loggedErrors.push({
            error: String(bindings.error),
            durationMs: Number(bindings.outbox_batch_duration_ms),
          });
        },
      },
    },
  );

  assert.equal(processBatchCalls, 2);
  assert.equal(loggedErrors.length, 1);
  assert.equal(loggedErrors[0]?.error, "redis unavailable");
  assert.equal(Number.isFinite(loggedErrors[0]?.durationMs), true);
  assert.equal((loggedErrors[0]?.durationMs ?? -1) >= 0, true);
});

test("runOutboxWorkerLoop logs outbox batch duration when work is processed", async () => {
  const abortController = new AbortController();
  const loggedInfos: Array<{ claimed: number; published: number; failed: number; durationMs: number }> = [];

  await runOutboxWorkerLoop(
    {
      poll_interval_ms: 10,
    },
    {
      processBatch: async () => {
        abortController.abort();

        return {
          claimed_count: 3,
          published_count: 2,
          failed_count: 1,
        };
      },
      sleep: async () => {},
      signal: abortController.signal,
      logger: {
        info: (bindings) => {
          const batch = bindings.outbox_batch as {
            claimed_count: number;
            published_count: number;
            failed_count: number;
          };

          loggedInfos.push({
            claimed: batch.claimed_count,
            published: batch.published_count,
            failed: batch.failed_count,
            durationMs: Number(bindings.outbox_batch_duration_ms),
          });
        },
        error: () => {},
      },
    },
  );

  assert.deepEqual(loggedInfos.length, 1);
  assert.deepEqual(loggedInfos[0]?.claimed, 3);
  assert.deepEqual(loggedInfos[0]?.published, 2);
  assert.deepEqual(loggedInfos[0]?.failed, 1);
  assert.equal(Number.isFinite(loggedInfos[0]?.durationMs), true);
  assert.equal((loggedInfos[0]?.durationMs ?? -1) >= 0, true);
});
