import Fastify from "fastify";
import { registerAuditRoutes } from "./routes/audit-routes.js";
import { registerAccessReviewRoutes, } from "./routes/access-review-routes.js";
import { registerControlPlaneRoutes, } from "./routes/control-plane-routes.js";
import { registerOperationsRoutes, } from "./routes/operations-routes.js";
import { registerRoleDefinitionRoutes, } from "./routes/role-definition-routes.js";
export const buildApp = async (dependencies) => {
    const app = Fastify({
        logger: dependencies.logger ?? true,
    });
    await registerAuditRoutes(app, {
        audit: dependencies.audit,
    });
    await registerRoleDefinitionRoutes(app, {
        controlPlane: dependencies.controlPlane,
    });
    await registerAccessReviewRoutes(app, {
        accessReviews: dependencies.accessReviews,
    });
    if (dependencies.operations !== undefined) {
        await registerOperationsRoutes(app, {
            operations: dependencies.operations,
        });
    }
    await registerControlPlaneRoutes(app, {
        controlPlane: dependencies.controlPlane,
    });
    return app;
};
