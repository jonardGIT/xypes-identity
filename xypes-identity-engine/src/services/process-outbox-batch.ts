import type {
  OutboxEventRecord,
  ProcessOutboxBatchDependencies,
  ProcessOutboxBatchInput,
  ProcessOutboxBatchResult,
} from "../domain/outbox-types.js";

const toIsoWithOffset = (now: Date, offsetSeconds: number): string => {
  return new Date(now.getTime() + offsetSeconds * 1000).toISOString();
};

const toOutboxErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown outbox processing error.";
};

const publishClaimedEvent = async (
  event: OutboxEventRecord,
  input: ProcessOutboxBatchInput,
  dependencies: ProcessOutboxBatchDependencies,
): Promise<"published" | "failed"> => {
  try {
    await dependencies.outboxEventHandler.handle(event);
    await dependencies.outboxRepository.markEventPublished({
      outbox_event_id: event.outbox_event_id,
      published_at: dependencies.clock.now().toISOString(),
    });

    return "published";
  } catch (error) {
    await dependencies.outboxRepository.rescheduleEvent({
      outbox_event_id: event.outbox_event_id,
      available_at: toIsoWithOffset(dependencies.clock.now(), input.retry_delay_seconds),
      last_error: toOutboxErrorMessage(error),
    });

    return "failed";
  }
};

export const processOutboxBatch = async (
  input: ProcessOutboxBatchInput,
  dependencies: ProcessOutboxBatchDependencies,
): Promise<ProcessOutboxBatchResult> => {
  const now = dependencies.clock.now();
  const claimedEvents = await dependencies.outboxRepository.claimAvailableEvents({
    now: now.toISOString(),
    batch_size: input.batch_size,
    lease_expires_at: toIsoWithOffset(now, input.lease_seconds),
  });

  let publishedCount = 0;
  let failedCount = 0;

  for (const event of claimedEvents) {
    const outcome = await publishClaimedEvent(event, input, dependencies);

    if (outcome === "published") {
      publishedCount += 1;
      continue;
    }

    failedCount += 1;
  }

  return {
    claimed_count: claimedEvents.length,
    published_count: publishedCount,
    failed_count: failedCount,
  };
};