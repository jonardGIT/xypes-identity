import { AuthorizationCacheInvalidationHandler } from "./services/authorization-cache-invalidation-handler.js";
import { processOutboxBatch } from "./services/process-outbox-batch.js";
import { runOutboxWorkerLoop, sleepWithAbort } from "./services/run-outbox-worker.js";
import { PostgresOutboxRepository } from "./infrastructure/postgres-outbox-repository.js";
import { RedisOperationalTelemetryStore } from "./infrastructure/redis-operational-telemetry-store.js";
import { RedisAuthorizationCacheVersionStore } from "./infrastructure/redis-authorization-cache.js";
import { loadWorkerRuntimeConfig } from "./runtime-config.js";
import { createClock, createPgPool, createRedisConnection } from "./runtime-support.js";

const config = loadWorkerRuntimeConfig();
const pool = await createPgPool(config.database_url);
const redisClient = await createRedisConnection(config.redis_url);
const clock = createClock();
const authorizationCacheVersionStore = new RedisAuthorizationCacheVersionStore(redisClient);
const operationalTelemetry = new RedisOperationalTelemetryStore(redisClient);
const outboxEventHandler = new AuthorizationCacheInvalidationHandler(
  authorizationCacheVersionStore,
);
const outboxRepository = new PostgresOutboxRepository(pool);
const abortController = new AbortController();
let shutdownPromise: Promise<void> | null = null;

const shutdown = async (): Promise<void> => {
  if (shutdownPromise !== null) {
    return shutdownPromise;
  }

  abortController.abort();
  shutdownPromise = Promise.all([
    redisClient.quit(),
    pool.end(),
  ]).then(() => undefined);

  return shutdownPromise;
};

process.once("SIGINT", () => {
  void shutdown();
});

process.once("SIGTERM", () => {
  void shutdown();
});

try {
  await runOutboxWorkerLoop(
    {
      poll_interval_ms: config.outbox_poll_interval_ms,
    },
    {
      processBatch: () => processOutboxBatch(
        {
          batch_size: config.outbox_batch_size,
          lease_seconds: config.outbox_lease_seconds,
          retry_delay_seconds: config.outbox_retry_delay_seconds,
        },
        {
          outboxRepository,
          outboxEventHandler,
          clock,
        },
      ),
      sleep: sleepWithAbort,
      signal: abortController.signal,
      logger: {
        info: (bindings, message) => {
          console.info(message, bindings);
        },
        error: (bindings, message) => {
          console.error(message, bindings);
        },
      },
      operationalTelemetry,
    },
  );
} finally {
  await shutdown();
}
