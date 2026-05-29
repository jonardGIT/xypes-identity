export class LoggerAuditPublisher {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    async publish(event) {
        this.logger.info({ audit_event: event }, "Published audit event.");
    }
}
