import type { XypesIdentityClient } from "@xypes-identity/sdk";
import type { FastifyInstance } from "fastify";
export type AuditClient = Pick<XypesIdentityClient["audit"], "listEvents">;
export interface AuditRouteDependencies {
    audit: AuditClient;
}
export declare const registerAuditRoutes: (app: FastifyInstance, dependencies: AuditRouteDependencies) => Promise<void>;
