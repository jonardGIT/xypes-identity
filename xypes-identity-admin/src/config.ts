export interface AdminConfig {
  host: string;
  port: number;
  engineBaseUrl: string;
}

const defaultHost = "0.0.0.0";
const defaultPort = 3001;

const readRequiredString = (environment: NodeJS.ProcessEnv, name: string): string => {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const readPort = (environment: NodeJS.ProcessEnv): number => {
  const rawPort = environment.PORT;

  if (rawPort === undefined || rawPort.trim().length === 0) {
    return defaultPort;
  }

  const parsedPort = Number(rawPort);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    throw new Error("PORT must be a positive integer.");
  }

  return parsedPort;
};

export const readConfig = (environment: NodeJS.ProcessEnv = process.env): AdminConfig => ({
  host: environment.HOST?.trim() || defaultHost,
  port: readPort(environment),
  engineBaseUrl: readRequiredString(environment, "ENGINE_BASE_URL"),
});