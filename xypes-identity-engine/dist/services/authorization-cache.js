export const loadTenantAuthorizationCacheVersions = async (tenantId, cacheDependencies) => {
    if (cacheDependencies === undefined) {
        return null;
    }
    return cacheDependencies.authorizationCacheVersionStore.getTenantVersions(tenantId);
};
export const loadAuthorizationEvaluationSnapshot = async (input, dependencies, versions) => {
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
    const snapshot = {
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
export const loadAuthorizationTraversalHits = async (input, dependencies, versions) => {
    if (dependencies.authorizationCache !== undefined && versions !== null && versions !== undefined) {
        const cachedTraversalHits = await dependencies.authorizationCache.authorizationExpansionCache.get({
            tenant_id: input.tenant_id,
            principal_id: input.principal_id,
            expansion_version: versions.expansion_version,
        });
        if (cachedTraversalHits !== null) {
            return {
                traversalHits: cachedTraversalHits,
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
            traversal_hits: traversalHits,
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
