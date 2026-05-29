const parseJson = (value, context) => {
    try {
        return JSON.parse(value);
    }
    catch {
        throw new Error(`Invalid JSON stored for ${context}.`);
    }
};
const toDecisionCacheKey = (input) => {
    const { request, versions } = input;
    return [
        "authorization",
        "decision",
        request.tenant_id,
        String(versions.decision_version),
        String(versions.expansion_version),
        request.application_id,
        request.principal_id,
        request.action,
        request.resource_type,
        request.resource_id ?? "-",
    ].join(":");
};
const toExpansionCacheKey = (input) => {
    return [
        "authorization",
        "expansion",
        input.tenant_id,
        String(input.expansion_version),
        input.principal_id,
    ].join(":");
};
const toDecisionVersionKey = (tenantId) => {
    return `authorization:version:decision:${tenantId}`;
};
const toExpansionVersionKey = (tenantId) => {
    return `authorization:version:expansion:${tenantId}`;
};
export class RedisAuthorizationDecisionCache {
    redisClient;
    ttlSeconds;
    constructor(redisClient, ttlSeconds) {
        this.redisClient = redisClient;
        this.ttlSeconds = ttlSeconds;
    }
    async get(input) {
        const cachedValue = await this.redisClient.get(toDecisionCacheKey(input));
        if (cachedValue === null) {
            return null;
        }
        return parseJson(cachedValue, "authorization decision cache");
    }
    async set(input) {
        await this.redisClient.set(toDecisionCacheKey(input), JSON.stringify(input.snapshot), { EX: this.ttlSeconds });
    }
}
export class RedisAuthorizationExpansionCache {
    redisClient;
    ttlSeconds;
    constructor(redisClient, ttlSeconds) {
        this.redisClient = redisClient;
        this.ttlSeconds = ttlSeconds;
    }
    async get(input) {
        const cachedValue = await this.redisClient.get(toExpansionCacheKey(input));
        if (cachedValue === null) {
            return null;
        }
        return parseJson(cachedValue, "authorization expansion cache");
    }
    async set(input) {
        await this.redisClient.set(toExpansionCacheKey(input), JSON.stringify(input.traversal_hits), { EX: this.ttlSeconds });
    }
}
export class RedisAuthorizationCacheVersionStore {
    redisClient;
    constructor(redisClient) {
        this.redisClient = redisClient;
    }
    async getTenantVersions(tenantId) {
        const [decisionVersion, expansionVersion] = await this.redisClient.mGet([
            toDecisionVersionKey(tenantId),
            toExpansionVersionKey(tenantId),
        ]);
        return {
            decision_version: decisionVersion !== null ? Number(decisionVersion) : 0,
            expansion_version: expansionVersion !== null ? Number(expansionVersion) : 0,
        };
    }
    async bumpTenantVersions(input) {
        if (!input.decision_version && !input.expansion_version) {
            return;
        }
        const transaction = this.redisClient.multi();
        if (input.decision_version) {
            transaction.incr(toDecisionVersionKey(input.tenant_id));
        }
        if (input.expansion_version) {
            transaction.incr(toExpansionVersionKey(input.tenant_id));
        }
        await transaction.exec();
    }
}
