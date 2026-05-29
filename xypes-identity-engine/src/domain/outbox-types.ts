import type { Clock } from "./session-types.js";

export interface OutboxEventRecord {
  outbox_event_id: string;
  tenant_id: string;
  topic: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  headers: Record<string, unknown>;
  correlation_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  available_at: string;
  published_at: string | null;
  attempt_count: number;
  last_error: string | null;
  created_at: string;
}

export interface ClaimOutboxEventsInput {
  now: string;
  batch_size: number;
  lease_expires_at: string;
}

export interface MarkOutboxEventPublishedInput {
  outbox_event_id: string;
  published_at: string;
}

export interface RescheduleOutboxEventInput {
  outbox_event_id: string;
  available_at: string;
  last_error: string;
}

export interface OutboxRepository {
  claimAvailableEvents(input: ClaimOutboxEventsInput): Promise<OutboxEventRecord[]>;
  markEventPublished(input: MarkOutboxEventPublishedInput): Promise<void>;
  rescheduleEvent(input: RescheduleOutboxEventInput): Promise<void>;
}

export interface OutboxEventHandler {
  handle(event: OutboxEventRecord): Promise<void>;
}

export interface ProcessOutboxBatchDependencies {
  outboxRepository: OutboxRepository;
  outboxEventHandler: OutboxEventHandler;
  clock: Clock;
}

export interface ProcessOutboxBatchInput {
  batch_size: number;
  lease_seconds: number;
  retry_delay_seconds: number;
}

export interface ProcessOutboxBatchResult {
  claimed_count: number;
  published_count: number;
  failed_count: number;
}