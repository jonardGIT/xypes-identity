import { type FastifyInstance } from "fastify";
import { type AuditClient } from "./routes/audit-routes.js";
import { type AccessReviewClient } from "./routes/access-review-routes.js";
import { type ControlPlaneClient } from "./routes/control-plane-routes.js";
import { type RoleDefinitionControlPlaneClient } from "./routes/role-definition-routes.js";
export type AdminControlPlaneClient = RoleDefinitionControlPlaneClient & ControlPlaneClient;
export type AdminAccessReviewClient = AccessReviewClient;
export type AdminAuditClient = AuditClient;
export interface AppDependencies {
    audit: AdminAuditClient;
    accessReviews: AdminAccessReviewClient;
    controlPlane: AdminControlPlaneClient;
    logger?: boolean;
}
export declare const buildApp: (dependencies: AppDependencies) => Promise<FastifyInstance>;
