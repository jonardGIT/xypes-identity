import type { ProcessOutboxBatchResult } from "../domain/outbox-types.js";
import type { OperationalTelemetryRecorder } from "../domain/operational-telemetry-types.js";

export interface OutboxWorkerLogger {
  info(bindings: Record<string, unknown>, message: string): void;
  error(bindings: Record<string, unknown>, message: string): void;
}

export interface OutboxWorkerLoopInput {
  poll_interval_ms: number;
}

export interface OutboxWorkerLoopDependencies {
  processBatch(): Promise<ProcessOutboxBatchResult>;
  sleep(milliseconds: number, signal: AbortSignal): Promise<void>;
  signal: AbortSignal;
  logger: OutboxWorkerLogger;
  operationalTelemetry?: OperationalTelemetryRecorder;
}

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown outbox worker error.";
};

export const sleepWithAbort = async (
  milliseconds: number,
  signal: AbortSignal,
): Promise<void> => {
  if (signal.aborted) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);

    const onAbort = (): void => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve();
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
};

export const runOutboxWorkerLoop = async (
  input: OutboxWorkerLoopInput,
  dependencies: OutboxWorkerLoopDependencies,
): Promise<void> => {
  while (!dependencies.signal.aborted) {
    const batchStartedAt = Date.now();

    try {
      const batchResult = await dependencies.processBatch();
      const batchDurationMs = Date.now() - batchStartedAt;

      await dependencies.operationalTelemetry?.recordReplayBatch({
        duration_ms: batchDurationMs,
        completed_at: new Date().toISOString(),
        claimed_count: batchResult.claimed_count,
        published_count: batchResult.published_count,
        failed_count: batchResult.failed_count,
      });

      if (batchResult.claimed_count > 0 || batchResult.failed_count > 0) {
        dependencies.logger.info(
          {
            outbox_batch: batchResult,
            outbox_batch_duration_ms: batchDurationMs,
          },
          "Processed outbox batch.",
        );
      }
    } catch (error) {
      dependencies.logger.error(
        {
          error: toErrorMessage(error),
          outbox_batch_duration_ms: Date.now() - batchStartedAt,
        },
        "Outbox worker batch failed.",
      );
    }

    if (dependencies.signal.aborted) {
      return;
    }

    await dependencies.sleep(input.poll_interval_ms, dependencies.signal);
  }
};
