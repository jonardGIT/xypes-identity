const required = (environment, name) => {
    const value = environment[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};
const integerWithDefault = (environment, name, defaultValue) => {
    const value = environment[name];
    if (value === undefined || value === "") {
        return defaultValue;
    }
    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        throw new Error(`Environment variable ${name} must be a positive integer.`);
    }
    return parsedValue;
};
const loadAuthorizationCacheConfig = (environment) => ({
    redis_url: required(environment, "REDIS_URL"),
    decision_cache_ttl_seconds: integerWithDefault(environment, "AUTHORIZATION_DECISION_CACHE_TTL_SECONDS", 30),
    expansion_cache_ttl_seconds: integerWithDefault(environment, "AUTHORIZATION_EXPANSION_CACHE_TTL_SECONDS", 30),
});
export const loadServerRuntimeConfig = (environment = process.env) => ({
    database_url: required(environment, "DATABASE_URL"),
    supabase_jwt_issuer: required(environment, "SUPABASE_JWT_ISSUER"),
    supabase_jwt_audience: required(environment, "SUPABASE_JWT_AUDIENCE"),
    supabase_jwks_url: required(environment, "SUPABASE_JWKS_URL"),
    port: integerWithDefault(environment, "PORT", 3000),
    ...loadAuthorizationCacheConfig(environment),
});
export const loadWorkerRuntimeConfig = (environment = process.env) => ({
    database_url: required(environment, "DATABASE_URL"),
    outbox_batch_size: integerWithDefault(environment, "OUTBOX_BATCH_SIZE", 100),
    outbox_lease_seconds: integerWithDefault(environment, "OUTBOX_LEASE_SECONDS", 30),
    outbox_retry_delay_seconds: integerWithDefault(environment, "OUTBOX_RETRY_DELAY_SECONDS", 30),
    outbox_poll_interval_ms: integerWithDefault(environment, "OUTBOX_POLL_INTERVAL_MS", 1000),
    ...loadAuthorizationCacheConfig(environment),
});
