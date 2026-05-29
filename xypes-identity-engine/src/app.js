import Fastify from "fastify";
import { registerAccessReviewFindingsRoute } from "./routes/access-review-findings-route.js";
import { registerAuditEventsRoute } from "./routes/audit-events-route.js";
import { registerCreateApplicationRoute } from "./routes/create-application-route.js";
import { registerAttachRolePermissionRoute } from "./routes/attach-role-permission-route.js";
import { registerAuthorizeCheckRoute } from "./routes/authorize-check-route.js";
import { registerAuthorizeExplainRoute } from "./routes/authorize-explain-route.js";
import { registerCreateDenyPolicyRoute } from "./routes/create-deny-policy-route.js";
import { registerCreateGroupRoute } from "./routes/create-group-route.js";
import { registerCreateGroupMembershipRoute } from "./routes/create-group-membership-route.js";
import { registerCreatePermissionRoute } from "./routes/create-permission-route.js";
import { registerCreateRoleBindingRoute } from "./routes/create-role-binding-route.js";
import { registerCreateRoleDefinitionRoute } from "./routes/create-role-definition-route.js";
import { registerResolveSessionRoute } from "./routes/resolve-session-route.js";
import { registerUpdateRoleBindingStatusRoute } from "./routes/update-role-binding-status-route.js";
import { registerUpdateRoleDefinitionStatusRoute } from "./routes/update-role-definition-status-route.js";
export const buildApp = async (dependencies) => {
    const app = Fastify({
        logger: true,
    });
    if (dependencies.principalRepository !== undefined
        && dependencies.tokenVerifier !== undefined
        && dependencies.auditPublisher !== undefined
        && dependencies.decisionIdGenerator !== undefined
        && dependencies.clock !== undefined) {
        await registerResolveSessionRoute(app, {
            principalRepository: dependencies.principalRepository,
            tokenVerifier: dependencies.tokenVerifier,
            auditPublisher: dependencies.auditPublisher,
            decisionIdGenerator: dependencies.decisionIdGenerator,
            clock: dependencies.clock,
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
        await registerCreateGroupMembershipRoute(app, dependencies.groupMembershipCreate);
    }
    if (dependencies.permissionCreate !== undefined) {
        await registerCreatePermissionRoute(app, dependencies.permissionCreate);
    }
    if (dependencies.roleBindingCreate !== undefined) {
        await registerCreateRoleBindingRoute(app, dependencies.roleBindingCreate);
    }
    if (dependencies.roleBindingStatusUpdate !== undefined) {
        await registerUpdateRoleBindingStatusRoute(app, dependencies.roleBindingStatusUpdate);
    }
    if (dependencies.roleDefinitionCreate !== undefined) {
        await registerCreateRoleDefinitionRoute(app, dependencies.roleDefinitionCreate);
    }
    if (dependencies.roleDefinitionStatusUpdate !== undefined) {
        await registerUpdateRoleDefinitionStatusRoute(app, dependencies.roleDefinitionStatusUpdate);
    }
    if (dependencies.rolePermissionAttach !== undefined) {
        await registerAttachRolePermissionRoute(app, dependencies.rolePermissionAttach);
    }
    return app;
};
