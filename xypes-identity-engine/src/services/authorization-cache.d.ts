import type { AuthorizationCacheDependencies, AuthorizationEvaluationSnapshot, TenantAuthorizationCacheVersions } from "../domain/authorization-cache-types.js";
import type { AuthorizationCheckDependencies, AuthorizationTraversalHitRecord } from "../domain/authorization-types.js";
type AuthorizationRequest = Parameters<AuthorizationCheckDependencies["authorizationRepository"]["findDirectPrincipalAllowBindings"]>[0];
export interface AuthorizationCacheAwareDependencies extends AuthorizationCheckDependencies {
    authorizationCache?: AuthorizationCacheDependencies;
}
export declare const loadTenantAuthorizationCacheVersions: (tenantId: string, cacheDependencies?: AuthorizationCacheDependencies) => Promise<TenantAuthorizationCacheVersions | null>;
export declare const loadAuthorizationEvaluationSnapshot: (input: AuthorizationRequest, dependencies: AuthorizationCacheAwareDependencies, versions?: TenantAuthorizationCacheVersions | null) => Promise<AuthorizationEvaluationSnapshot>;
export declare const loadAuthorizationTraversalHits: (input: AuthorizationRequest, dependencies: AuthorizationCacheAwareDependencies, versions?: TenantAuthorizationCacheVersions | null) => Promise<AuthorizationTraversalHitRecord[]>;
export {};
