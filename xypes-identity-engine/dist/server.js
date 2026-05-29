import { buildApp } from "./app.js";
import { LoggerAuditPublisher } from "./infrastructure/logger-audit-publisher.js";
import { PostgresAccessReviewRepository } from "./infrastructure/postgres-access-review-repository.js";
import { PostgresAuditEventRepository } from "./infrastructure/postgres-audit-event-repository.js";
import { createOpenTelemetryAuthorizationTelemetry } from "./infrastructure/open-telemetry-authorization-telemetry.js";
import { PostgresApplicationRepository } from "./infrastructure/postgres-application-repository.js";
import { PostgresAuthorizationRepository } from "./infrastructure/postgres-authorization-repository.js";
import { PostgresDenyPolicyRepository } from "./infrastructure/postgres-deny-policy-repository.js";
import { PostgresGroupRepository } from "./infrastructure/postgres-group-repository.js";
import { PostgresGroupMembershipRepository } from "./infrastructure/postgres-group-membership-repository.js";
import { PostgresPermissionRepository } from "./infrastructure/postgres-permission-repository.js";
import { PostgresPrincipalRepository } from "./infrastructure/postgres-principal-repository.js";
import { RedisOperationalTelemetryStore } from "./infrastructure/redis-operational-telemetry-store.js";
import { PostgresRoleBindingRepository } from "./infrastructure/postgres-role-binding-repository.js";
import { PostgresRoleDefinitionRepository } from "./infrastructure/postgres-role-definition-repository.js";
import { PostgresRolePermissionRepository } from "./infrastructure/postgres-role-permission-repository.js";
import { RedisAuthorizationCacheVersionStore, RedisAuthorizationDecisionCache, RedisAuthorizationExpansionCache, } from "./infrastructure/redis-authorization-cache.js";
import { loadServerRuntimeConfig } from "./runtime-config.js";
import { createClock, createDecisionIdGenerator, createPgPool, createRedisConnection, } from "./runtime-support.js";
import { JwtSessionVerifier } from "./services/jwt-session-verifier.js";
const config = loadServerRuntimeConfig();
const tokenVerifier = new JwtSessionVerifier({
    issuer: config.supabase_jwt_issuer,
    audience: config.supabase_jwt_audience,
    jwksUrl: config.supabase_jwks_url,
});
const pool = await createPgPool(config.database_url);
const redisClient = await createRedisConnection(config.redis_url);
const auditLogSink = {
    info: (bindings, message) => {
        console.info(message, bindings);
    },
};
const auditPublisher = new LoggerAuditPublisher(auditLogSink);
const authorizationTelemetry = await createOpenTelemetryAuthorizationTelemetry();
const decisionIdGenerator = createDecisionIdGenerator();
const clock = createClock();
const authorizationCache = {
    authorizationDecisionCache: new RedisAuthorizationDecisionCache(redisClient, config.decision_cache_ttl_seconds),
    authorizationExpansionCache: new RedisAuthorizationExpansionCache(redisClient, config.expansion_cache_ttl_seconds),
    authorizationCacheVersionStore: new RedisAuthorizationCacheVersionStore(redisClient),
};
const operationalTelemetry = new RedisOperationalTelemetryStore(redisClient);
const dependencies = {
    principalRepository: new PostgresPrincipalRepository(pool),
    tokenVerifier,
    auditPublisher,
    decisionIdGenerator,
    clock,
    operationalTelemetry,
};
const authorizationCheckDependencies = {
    authorizationRepository: new PostgresAuthorizationRepository(pool),
};
const applicationRepository = new PostgresApplicationRepository(pool);
const accessReviewRepository = new PostgresAccessReviewRepository(pool);
const auditEventRepository = new PostgresAuditEventRepository(pool);
const denyPolicyRepository = new PostgresDenyPolicyRepository(pool);
const groupRepository = new PostgresGroupRepository(pool);
const groupMembershipRepository = new PostgresGroupMembershipRepository(pool);
const permissionRepository = new PostgresPermissionRepository(pool);
const roleBindingRepository = new PostgresRoleBindingRepository(pool);
const roleDefinitionRepository = new PostgresRoleDefinitionRepository(pool);
const rolePermissionRepository = new PostgresRolePermissionRepository(pool);
const groupCreateDependencies = {
    groupRepository,
    idGenerator: dependencies.decisionIdGenerator,
    clock: dependencies.clock,
};
const applicationCreateDependencies = {
    applicationRepository,
    idGenerator: dependencies.decisionIdGenerator,
    clock: dependencies.clock,
};
const accessReviewReadDependencies = {
    accessReviewRepository,
    clock: dependencies.clock,
};
const auditReadDependencies = {
    auditEventRepository,
    clock: dependencies.clock,
};
const denyPolicyCreateDependencies = {
    denyPolicyRepository,
    idGenerator: dependencies.decisionIdGenerator,
    clock: dependencies.clock,
};
const groupMembershipCreateDependencies = {
    groupMembershipRepository,
    idGenerator: dependencies.decisionIdGenerator,
    clock: dependencies.clock,
};
const permissionCreateDependencies = {
    permissionRepository,
    idGenerator: dependencies.decisionIdGenerator,
    clock: dependencies.clock,
};
const roleBindingCreateDependencies = {
    roleBindingRepository,
    idGenerator: dependencies.decisionIdGenerator,
    clock: dependencies.clock,
};
const roleBindingStatusUpdateDependencies = {
    roleBindingRepository,
    idGenerator: dependencies.decisionIdGenerator,
    clock: dependencies.clock,
};
const roleDefinitionCreateDependencies = {
    roleDefinitionRepository,
    idGenerator: dependencies.decisionIdGenerator,
    clock: dependencies.clock,
};
const roleDefinitionStatusUpdateDependencies = {
    roleDefinitionRepository,
    idGenerator: dependencies.decisionIdGenerator,
    clock: dependencies.clock,
};
const rolePermissionAttachDependencies = {
    rolePermissionRepository,
    idGenerator: dependencies.decisionIdGenerator,
    clock: dependencies.clock,
};
const app = await buildApp({
    ...dependencies,
    auditRead: auditReadDependencies,
    accessReviewRead: accessReviewReadDependencies,
    applicationCreate: applicationCreateDependencies,
    authorizationCheck: {
        ...authorizationCheckDependencies,
        authorizationCache,
        decisionIdGenerator,
        decisionTelemetry: authorizationTelemetry,
        operationalTelemetry,
    },
    denyPolicyCreate: denyPolicyCreateDependencies,
    groupCreate: groupCreateDependencies,
    groupMembershipCreate: groupMembershipCreateDependencies,
    permissionCreate: permissionCreateDependencies,
    roleBindingCreate: roleBindingCreateDependencies,
    roleBindingStatusUpdate: roleBindingStatusUpdateDependencies,
    roleDefinitionCreate: roleDefinitionCreateDependencies,
    roleDefinitionStatusUpdate: roleDefinitionStatusUpdateDependencies,
    rolePermissionAttach: rolePermissionAttachDependencies,
    operationalTelemetry,
});
app.addHook("onClose", async () => {
    await Promise.all([
        redisClient.quit(),
        pool.end(),
    ]);
});
auditLogSink.info = app.log.info.bind(app.log);
await app.listen({
    host: "0.0.0.0",
    port: config.port,
});
