import type {
  AuthorizationDecisionCache,
  AuthorizationDecisionCacheGetInput,
  AuthorizationDecisionCacheSetInput,
  AuthorizationEvaluationSnapshot,
  AuthorizationExpansionCache,
  AuthorizationExpansionCacheGetInput,
  AuthorizationExpansionCacheSetInput,
  AuthorizationCacheVersionStore,
  BumpTenantAuthorizationCacheVersionsInput,
  TenantAuthorizationCacheVersions,
} from "../domain/authorization-cache-types.js";

interface RedisMulti {
  incr(key: string): RedisMulti;
  exec(): Promise<unknown>;
}

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { EX: number }): Promise<unknown>;
  mGet(keys: string[]): Promise<Array<string | null>>;
  multi(): RedisMulti;
}

const parseJson = <Value>(value: string, context: string): Value => {
  try {
    return JSON.parse(value) as Value;
  } catch {
    throw new Error(`Invalid JSON stored for ${context}.`);
  }
};

const toDecisionCacheKey = (input: AuthorizationDecisionCacheGetInput): string => {
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

const toExpansionCacheKey = (input: AuthorizationExpansionCacheGetInput): string => {
  return [
    "authorization",
    "expansion",
    input.tenant_id,
    String(input.expansion_version),
    input.principal_id,
  ].join(":");
};

const toDecisionVersionKey = (tenantId: string): string => {
  return `authorization:version:decision:${tenantId}`;
};

const toExpansionVersionKey = (tenantId: string): string => {
  return `authorization:version:expansion:${tenantId}`;
};

export class RedisAuthorizationDecisionCache implements AuthorizationDecisionCache {
  constructor(
    private readonly redisClient: RedisClient,
    private readonly ttlSeconds: number,
  ) {}

  async get(input: AuthorizationDecisionCacheGetInput): Promise<AuthorizationEvaluationSnapshot | null> {
    const cachedValue = await this.redisClient.get(toDecisionCacheKey(input));

    if (cachedValue === null) {
      return null;
    }

    return parseJson<AuthorizationEvaluationSnapshot>(cachedValue, "authorization decision cache");
  }

  async set(input: AuthorizationDecisionCacheSetInput): Promise<void> {
    await this.redisClient.set(
      toDecisionCacheKey(input),
      JSON.stringify(input.snapshot),
      { EX: this.ttlSeconds },
    );
  }
}

export class RedisAuthorizationExpansionCache implements AuthorizationExpansionCache {
  constructor(
    private readonly redisClient: RedisClient,
    private readonly ttlSeconds: number,
  ) {}

  async get(input: AuthorizationExpansionCacheGetInput) {
    const cachedValue = await this.redisClient.get(toExpansionCacheKey(input));

    if (cachedValue === null) {
      return null;
    }

    return parseJson<AuthorizationExpansionCacheSetInput["traversal_hits"]>(
      cachedValue,
      "authorization expansion cache",
    );
  }

  async set(input: AuthorizationExpansionCacheSetInput): Promise<void> {
    await this.redisClient.set(
      toExpansionCacheKey(input),
      JSON.stringify(input.traversal_hits),
      { EX: this.ttlSeconds },
    );
  }
}

export class RedisAuthorizationCacheVersionStore implements AuthorizationCacheVersionStore {
  constructor(private readonly redisClient: RedisClient) {}

  async getTenantVersions(tenantId: string): Promise<TenantAuthorizationCacheVersions> {
    const [decisionVersion, expansionVersion] = await this.redisClient.mGet([
      toDecisionVersionKey(tenantId),
      toExpansionVersionKey(tenantId),
    ]);

    return {
      decision_version: decisionVersion !== null ? Number(decisionVersion) : 0,
      expansion_version: expansionVersion !== null ? Number(expansionVersion) : 0,
    };
  }

  async bumpTenantVersions(input: BumpTenantAuthorizationCacheVersionsInput): Promise<void> {
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
