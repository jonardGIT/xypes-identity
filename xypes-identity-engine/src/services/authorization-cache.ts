import type { AuthorizationExplainTraversalHit } from "@xypes-identity/shared";

import type {
  AuthorizationCacheDependencies,
  AuthorizationEvaluationSnapshot,
  TenantAuthorizationCacheVersions,
} from "../domain/authorization-cache-types.js";
import type {
  AuthorizationCheckDependencies,
  AuthorizationTraversalHitRecord,
} from "../domain/authorization-types.js";

type AuthorizationRequest = Parameters<
  AuthorizationCheckDependencies["authorizationRepository"]["findDirectPrincipalAllowBindings"]
>[0];

export interface AuthorizationCacheAwareDependencies extends AuthorizationCheckDependencies {
  authorizationCache?: AuthorizationCacheDependencies;
}

export type AuthorizationCacheReadStatus = "disabled" | "hit" | "miss";

export interface AuthorizationSnapshotLoadResult {
  snapshot: AuthorizationEvaluationSnapshot;
  decisionCacheStatus: AuthorizationCacheReadStatus;
}

export interface AuthorizationTraversalHitsLoadResult {
  traversalHits: AuthorizationTraversalHitRecord[];
  expansionCacheStatus: AuthorizationCacheReadStatus;
}

export const loadTenantAuthorizationCacheVersions = async (
  tenantId: string,
  cacheDependencies?: AuthorizationCacheDependencies,
): Promise<TenantAuthorizationCacheVersions | null> => {
  if (cacheDependencies === undefined) {
    return null;
  }

  return cacheDependencies.authorizationCacheVersionStore.getTenantVersions(tenantId);
};

export const loadAuthorizationEvaluationSnapshot = async (
  input: AuthorizationRequest,
  dependencies: AuthorizationCacheAwareDependencies,
  versions?: TenantAuthorizationCacheVersions | null,
) : Promise<AuthorizationSnapshotLoadResult> => {
  if (dependencies.authorizationCache !== undefined && versions !== null && versions !== undefined) {
    const cachedSnapshot = await dependencies.authorizationCache.authorizationDecisionCache.get({
      request: input,
      versions,
    });

    if (cachedSnapshot !== null) {
      return {
        snapshot: cachedSnapshot,
        decisionCacheStatus: "hit",
      };
    }
  }

  const [matchedBindings, denyPolicies] = await Promise.all([
    dependencies.authorizationRepository.findDirectPrincipalAllowBindings(input),
    dependencies.authorizationRepository.findDirectPrincipalDenyPolicies(input),
  ]);
  const snapshot: AuthorizationEvaluationSnapshot = {
    matched_bindings: matchedBindings,
    deny_policies: denyPolicies,
  };

  if (dependencies.authorizationCache !== undefined && versions !== null && versions !== undefined) {
    await dependencies.authorizationCache.authorizationDecisionCache.set({
      request: input,
      versions,
      snapshot,
    });

    return {
      snapshot,
      decisionCacheStatus: "miss",
    };
  }

  return {
    snapshot,
    decisionCacheStatus: "disabled",
  };
};

export const loadAuthorizationTraversalHits = async (
  input: AuthorizationRequest,
  dependencies: AuthorizationCacheAwareDependencies,
  versions?: TenantAuthorizationCacheVersions | null,
) : Promise<AuthorizationTraversalHitsLoadResult> => {
  if (dependencies.authorizationCache !== undefined && versions !== null && versions !== undefined) {
    const cachedTraversalHits = await dependencies.authorizationCache.authorizationExpansionCache.get({
      tenant_id: input.tenant_id,
      principal_id: input.principal_id,
      expansion_version: versions.expansion_version,
    });

    if (cachedTraversalHits !== null) {
      return {
        traversalHits: cachedTraversalHits as AuthorizationTraversalHitRecord[],
        expansionCacheStatus: "hit",
      };
    }
  }

  const traversalHits = await dependencies.authorizationRepository.findPrincipalGroupTraversalHits(input);

  if (dependencies.authorizationCache !== undefined && versions !== null && versions !== undefined) {
    await dependencies.authorizationCache.authorizationExpansionCache.set({
      tenant_id: input.tenant_id,
      principal_id: input.principal_id,
      expansion_version: versions.expansion_version,
      traversal_hits: traversalHits as AuthorizationExplainTraversalHit[],
    });

    return {
      traversalHits,
      expansionCacheStatus: "miss",
    };
  }

  return {
    traversalHits,
    expansionCacheStatus: "disabled",
  };
};
