import Fastify, { type FastifyInstance } from "fastify";

import type { ListAuditEventsDependencies } from "./domain/audit-event-types.js";
import type { ListAccessReviewFindingsDependencies } from "./domain/access-review-types.js";
import type {
  CreateApplicationDependencies,
  ListApplicationsDependencies,
} from "./domain/application-types.js";
import type { CreateDenyPolicyDependencies } from "./domain/deny-policy-types.js";
import type { CreateGroupDependencies } from "./domain/group-types.js";
import type { CreateGroupMembershipDependencies } from "./domain/group-membership-types.js";
import type { RunIdentityReconciliationDependencies } from "./domain/identity-reconciliation-types.js";
import type {
  CreatePermissionDependencies,
  ListPermissionsDependencies,
} from "./domain/permission-types.js";
import type { CreateRoleBindingDependencies } from "./domain/role-binding-types.js";
import type { UpdateRoleBindingStatusDependencies } from "./domain/role-binding-types.js";
import type {
  CreateRoleDefinitionDependencies,
  ListRoleDefinitionsDependencies,
  UpdateRoleDefinitionStatusDependencies,
} from "./domain/role-definition-types.js";
import type { AttachRolePermissionDependencies } from "./domain/role-permission-types.js";
import type { OperationalTelemetryRecorder } from "./domain/operational-telemetry-types.js";
import type { ResolveSessionDependencies } from "./domain/session-types.js";
import type { AuthorizeCheckServiceDependencies } from "./services/authorize-check.js";
import type { AuthorizeExplainServiceDependencies } from "./services/authorize-explain.js";
import { registerAccessReviewFindingsRoute } from "./routes/access-review-findings-route.js";
import { registerAuditEventsRoute } from "./routes/audit-events-route.js";
import { registerCoreApiReferenceRoute } from "./routes/core-api-reference-route.js";
import { registerCreateApplicationRoute } from "./routes/create-application-route.js";
import { registerListApplicationsRoute } from "./routes/list-applications-route.js";
import { registerAttachRolePermissionRoute } from "./routes/attach-role-permission-route.js";
import { registerAuthorizeCheckRoute } from "./routes/authorize-check-route.js";
import { registerAuthorizeExplainRoute } from "./routes/authorize-explain-route.js";
import { registerCreateDenyPolicyRoute } from "./routes/create-deny-policy-route.js";
import { registerCreateGroupRoute } from "./routes/create-group-route.js";
import { registerCreateGroupMembershipRoute } from "./routes/create-group-membership-route.js";
import { registerCreatePermissionRoute } from "./routes/create-permission-route.js";
import { registerListPermissionsRoute } from "./routes/list-permissions-route.js";
import { registerCreateRoleBindingRoute } from "./routes/create-role-binding-route.js";
import { registerCreateRoleDefinitionRoute } from "./routes/create-role-definition-route.js";
import { registerListRoleDefinitionsRoute } from "./routes/list-role-definitions-route.js";
import { registerOperationsIdentityReconciliationRoute } from "./routes/operations-identity-reconciliation-route.js";
import { registerOperationsTelemetryRoute } from "./routes/operations-telemetry-route.js";
import { registerResolveSessionRoute } from "./routes/resolve-session-route.js";
import { registerUpdateRoleBindingStatusRoute } from "./routes/update-role-binding-status-route.js";
import { registerUpdateRoleDefinitionStatusRoute } from "./routes/update-role-definition-status-route.js";

export interface AppDependencies {
  principalRepository?: ResolveSessionDependencies["principalRepository"];
  tokenVerifier?: ResolveSessionDependencies["tokenVerifier"];
  auditPublisher?: ResolveSessionDependencies["auditPublisher"];
  decisionIdGenerator?: ResolveSessionDependencies["decisionIdGenerator"];
  clock?: ResolveSessionDependencies["clock"];
  sessionLogger?: ResolveSessionDependencies["sessionLogger"];
  auditRead?: ListAuditEventsDependencies;
  accessReviewRead?: ListAccessReviewFindingsDependencies;
  applicationCreate?: CreateApplicationDependencies;
  applicationRead?: ListApplicationsDependencies;
  authorizationCheck?: AuthorizeCheckServiceDependencies &
    AuthorizeExplainServiceDependencies;
  denyPolicyCreate?: CreateDenyPolicyDependencies;
  groupCreate?: CreateGroupDependencies;
  groupMembershipCreate?: CreateGroupMembershipDependencies;
  identityReconciliation?: RunIdentityReconciliationDependencies;
  permissionCreate?: CreatePermissionDependencies;
  permissionRead?: ListPermissionsDependencies;
  roleBindingCreate?: CreateRoleBindingDependencies;
  roleBindingStatusUpdate?: UpdateRoleBindingStatusDependencies;
  roleDefinitionCreate?: CreateRoleDefinitionDependencies;
  roleDefinitionRead?: ListRoleDefinitionsDependencies;
  roleDefinitionStatusUpdate?: UpdateRoleDefinitionStatusDependencies;
  rolePermissionAttach?: AttachRolePermissionDependencies;
  operationalTelemetry?: OperationalTelemetryRecorder;
}

export const buildApp = async (
  dependencies: AppDependencies,
): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: true,
  });

  if (dependencies.clock !== undefined) {
    await registerCoreApiReferenceRoute(app, {
      clock: dependencies.clock,
    });
  }

  if (
    dependencies.operationalTelemetry !== undefined &&
    dependencies.clock !== undefined
  ) {
    await registerOperationsTelemetryRoute(app, {
      operationalTelemetry: dependencies.operationalTelemetry,
      clock: dependencies.clock,
    });
  }

  if (dependencies.identityReconciliation !== undefined) {
    await registerOperationsIdentityReconciliationRoute(
      app,
      dependencies.identityReconciliation,
    );
  }

  if (
    dependencies.principalRepository !== undefined &&
    dependencies.tokenVerifier !== undefined &&
    dependencies.auditPublisher !== undefined &&
    dependencies.decisionIdGenerator !== undefined &&
    dependencies.clock !== undefined
  ) {
    await registerResolveSessionRoute(app, {
      principalRepository: dependencies.principalRepository,
      tokenVerifier: dependencies.tokenVerifier,
      auditPublisher: dependencies.auditPublisher,
      decisionIdGenerator: dependencies.decisionIdGenerator,
      clock: dependencies.clock,
      sessionLogger: dependencies.sessionLogger ?? app.log,
      operationalTelemetry: dependencies.operationalTelemetry,
    });
  }

  if (dependencies.accessReviewRead !== undefined) {
    await registerAccessReviewFindingsRoute(app, dependencies.accessReviewRead);
  }

  if (dependencies.auditRead !== undefined) {
    await registerAuditEventsRoute(app, dependencies.auditRead);
  }

  if (dependencies.applicationCreate !== undefined) {
    await registerCreateApplicationRoute(app, dependencies.applicationCreate);
  }

  if (dependencies.applicationRead !== undefined) {
    await registerListApplicationsRoute(app, dependencies.applicationRead);
  }

  if (dependencies.authorizationCheck !== undefined) {
    const authorizationDecisionDependencies = {
      ...dependencies.authorizationCheck,
      decisionLogger: dependencies.authorizationCheck.decisionLogger ?? app.log,
    };

    await registerAuthorizeCheckRoute(app, authorizationDecisionDependencies);
    await registerAuthorizeExplainRoute(app, authorizationDecisionDependencies);
  }

  if (dependencies.denyPolicyCreate !== undefined) {
    await registerCreateDenyPolicyRoute(app, dependencies.denyPolicyCreate);
  }

  if (dependencies.groupCreate !== undefined) {
    await registerCreateGroupRoute(app, dependencies.groupCreate);
  }

  if (dependencies.groupMembershipCreate !== undefined) {
    await registerCreateGroupMembershipRoute(
      app,
      dependencies.groupMembershipCreate,
    );
  }

  if (dependencies.permissionCreate !== undefined) {
    await registerCreatePermissionRoute(app, dependencies.permissionCreate);
  }

  if (dependencies.permissionRead !== undefined) {
    await registerListPermissionsRoute(app, dependencies.permissionRead);
  }

  if (dependencies.roleBindingCreate !== undefined) {
    await registerCreateRoleBindingRoute(app, dependencies.roleBindingCreate);
  }

  if (dependencies.roleBindingStatusUpdate !== undefined) {
    await registerUpdateRoleBindingStatusRoute(
      app,
      dependencies.roleBindingStatusUpdate,
    );
  }

  if (dependencies.roleDefinitionCreate !== undefined) {
    await registerCreateRoleDefinitionRoute(
      app,
      dependencies.roleDefinitionCreate,
    );
  }

  if (dependencies.roleDefinitionRead !== undefined) {
    await registerListRoleDefinitionsRoute(
      app,
      dependencies.roleDefinitionRead,
    );
  }

  if (dependencies.roleDefinitionStatusUpdate !== undefined) {
    await registerUpdateRoleDefinitionStatusRoute(
      app,
      dependencies.roleDefinitionStatusUpdate,
    );
  }

  if (dependencies.rolePermissionAttach !== undefined) {
    await registerAttachRolePermissionRoute(
      app,
      dependencies.rolePermissionAttach,
    );
  }

  return app;
};
