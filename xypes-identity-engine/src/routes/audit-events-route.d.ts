import type { FastifyInstance } from "fastify";
import type { ListAuditEventsDependencies } from "../domain/audit-event-types.js";
export declare const registerAuditEventsRoute: (app: FastifyInstance, dependencies: ListAuditEventsDependencies) => Promise<void>;
