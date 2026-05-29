import { randomUUID } from "node:crypto";

import { createClient } from "redis";

interface PgClient {
  query<Row extends { [key: string]: unknown }>(
    queryText: string,
    values: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
  release(): void;
}

export interface PgPool {
  query<Row extends { [key: string]: unknown }>(
    queryText: string,
    values: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
  connect(): Promise<PgClient>;
  end(): Promise<void>;
}

interface PgModule {
  Pool: new (config: { connectionString: string }) => PgPool;
}

const importPgModule = async (): Promise<PgModule> => {
  const dynamicImport = Function(
    "specifier",
    "return import(specifier);",
  ) as (specifier: string) => Promise<unknown>;

  return (await dynamicImport("pg")) as PgModule;
};

export const createPgPool = async (connectionString: string): Promise<PgPool> => {
  const { Pool } = await importPgModule();

  return new Pool({
    connectionString,
  });
};

export const createRedisConnection = async (
  redisUrl: string,
): Promise<ReturnType<typeof createClient>> => {
  const client = createClient({
    url: redisUrl,
  });

  await client.connect();

  return client;
};

export const createDecisionIdGenerator = () => ({
  nextId: (): string => randomUUID(),
});

export const createClock = () => ({
  now: (): Date => new Date(),
});
