import {
  noOpAuthorizationTelemetry,
  type AuthorizationSpan,
  type AuthorizationTelemetry,
} from "../services/authorization-observability.js";

type OpenTelemetryAttributeValue = string | number | boolean;

interface OpenTelemetrySpan {
  setAttribute(name: string, value: OpenTelemetryAttributeValue): void;
  recordException(error: Error): void;
  setStatus(status: { code: number; message?: string }): void;
  end(): void;
}

interface OpenTelemetryTracer {
  startActiveSpan<T>(
    name: string,
    options: { attributes?: Record<string, OpenTelemetryAttributeValue> },
    callback: (span: OpenTelemetrySpan) => Promise<T>,
  ): Promise<T>;
}

interface OpenTelemetryModule {
  trace: {
    getTracer(name: string): OpenTelemetryTracer;
  };
  SpanStatusCode?: {
    ERROR: number;
  };
}

const importOpenTelemetryApi = async (): Promise<OpenTelemetryModule | null> => {
  try {
    const dynamicImport = Function(
      "specifier",
      "return import(specifier);",
    ) as (specifier: string) => Promise<unknown>;

    return (await dynamicImport("@opentelemetry/api")) as OpenTelemetryModule;
  } catch {
    return null;
  }
};

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
};

const toOpenTelemetryAttributes = (
  attributes: Record<string, string | number | boolean | null | undefined>,
): Record<string, OpenTelemetryAttributeValue> => {
  const filteredEntries = Object.entries(attributes).filter(
    (entry): entry is [string, OpenTelemetryAttributeValue] =>
      entry[1] !== undefined && entry[1] !== null,
  );

  return Object.fromEntries(filteredEntries);
};

const toAuthorizationSpan = (span: OpenTelemetrySpan): AuthorizationSpan => ({
  setAttribute: (name, value) => {
    span.setAttribute(name, value);
  },
  recordException: (error) => {
    span.recordException(toError(error));
  },
});

export const createOpenTelemetryAuthorizationTelemetry = async (): Promise<AuthorizationTelemetry> => {
  const openTelemetryModule = await importOpenTelemetryApi();

  if (openTelemetryModule === null) {
    return noOpAuthorizationTelemetry;
  }

  const tracer = openTelemetryModule.trace.getTracer("xypes-identity-engine.authorization");

  return {
    runInSpan: async (spanName, attributes, callback) => tracer.startActiveSpan(
      spanName,
      { attributes: toOpenTelemetryAttributes(attributes) },
      async (span) => {
        try {
          return await callback(toAuthorizationSpan(span));
        } catch (error) {
          span.recordException(toError(error));

          if (openTelemetryModule.SpanStatusCode?.ERROR !== undefined) {
            span.setStatus({
              code: openTelemetryModule.SpanStatusCode.ERROR,
              message: toError(error).message,
            });
          }

          throw error;
        } finally {
          span.end();
        }
      },
    ),
  };
};