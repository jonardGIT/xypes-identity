import { noOpAuthorizationTelemetry, } from "../services/authorization-observability.js";
const importOpenTelemetryApi = async () => {
    try {
        const dynamicImport = Function("specifier", "return import(specifier);");
        return (await dynamicImport("@opentelemetry/api"));
    }
    catch {
        return null;
    }
};
const toError = (error) => {
    if (error instanceof Error) {
        return error;
    }
    return new Error(String(error));
};
const toOpenTelemetryAttributes = (attributes) => {
    const filteredEntries = Object.entries(attributes).filter((entry) => entry[1] !== undefined && entry[1] !== null);
    return Object.fromEntries(filteredEntries);
};
const toAuthorizationSpan = (span) => ({
    setAttribute: (name, value) => {
        span.setAttribute(name, value);
    },
    recordException: (error) => {
        span.recordException(toError(error));
    },
});
export const createOpenTelemetryAuthorizationTelemetry = async () => {
    const openTelemetryModule = await importOpenTelemetryApi();
    if (openTelemetryModule === null) {
        return noOpAuthorizationTelemetry;
    }
    const tracer = openTelemetryModule.trace.getTracer("xypes-identity-engine.authorization");
    return {
        runInSpan: async (spanName, attributes, callback) => tracer.startActiveSpan(spanName, { attributes: toOpenTelemetryAttributes(attributes) }, async (span) => {
            try {
                return await callback(toAuthorizationSpan(span));
            }
            catch (error) {
                span.recordException(toError(error));
                if (openTelemetryModule.SpanStatusCode?.ERROR !== undefined) {
                    span.setStatus({
                        code: openTelemetryModule.SpanStatusCode.ERROR,
                        message: toError(error).message,
                    });
                }
                throw error;
            }
            finally {
                span.end();
            }
        }),
    };
};
