import Fastify, { type FastifyInstance } from "fastify";

import { registerAuditRoutes, type AuditClient } from "./routes/audit-routes.js";
import {
  registerAccessReviewRoutes,
  type AccessReviewClient,
} from "./routes/access-review-routes.js";
import {
  registerControlPlaneRoutes,
  type ControlPlaneClient,
} from "./routes/control-plane-routes.js";
import {
  registerOperationsRoutes,
  type OperationsClient,
} from "./routes/operations-routes.js";
import {
  registerOnboardingRoutes,
  type OnboardingControlPlaneClient,
} from "./routes/onboarding-routes.js";
import {
  registerRoleDefinitionRoutes,
  type RoleDefinitionControlPlaneClient,
} from "./routes/role-definition-routes.js";

export type AdminControlPlaneClient =
  RoleDefinitionControlPlaneClient
  & ControlPlaneClient
  & OnboardingControlPlaneClient;
export type AdminAccessReviewClient = AccessReviewClient;
export type AdminAuditClient = AuditClient;
export type AdminOperationsClient = OperationsClient;

export interface AppDependencies {
  audit: AdminAuditClient;
  accessReviews: AdminAccessReviewClient;
  controlPlane: AdminControlPlaneClient;
  operations?: AdminOperationsClient;
  logger?: boolean;
}

export const buildApp = async (dependencies: AppDependencies): Promise<FastifyInstance> => {
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
  await registerOnboardingRoutes(app, {
    controlPlane: dependencies.controlPlane,
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