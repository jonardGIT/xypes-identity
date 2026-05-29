import { randomUUID } from "node:crypto";
import { createClient } from "redis";
const importPgModule = async () => {
    const dynamicImport = Function("specifier", "return import(specifier);");
    return (await dynamicImport("pg"));
};
export const createPgPool = async (connectionString) => {
    const { Pool } = await importPgModule();
    return new Pool({
        connectionString,
    });
};
export const createRedisConnection = async (redisUrl) => {
    const client = createClient({
        url: redisUrl,
    });
    await client.connect();
    return client;
};
export const createDecisionIdGenerator = () => ({
    nextId: () => randomUUID(),
});
export const createClock = () => ({
    now: () => new Date(),
});
