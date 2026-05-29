import type { PrincipalResolvedAuditEvent } from "@xypes-identity/shared";

import type { AuditPublisher } from "../domain/session-types.js";

interface AuditLogger {
  info(bindings: { audit_event: PrincipalResolvedAuditEvent }, message: string): void;
}

export class LoggerAuditPublisher implements AuditPublisher {
  constructor(private readonly logger: AuditLogger) {}

  async publish(event: PrincipalResolvedAuditEvent): Promise<void> {
    this.logger.info({ audit_event: event }, "Published audit event.");
  }
}