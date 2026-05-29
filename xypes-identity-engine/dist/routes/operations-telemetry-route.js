export const registerOperationsTelemetryRoute = async (app, dependencies) => {
    app.get("/v1/operations/telemetry", async (_request, reply) => {
        const response = await dependencies.operationalTelemetry.getSnapshot(dependencies.clock.now().toISOString());
        return reply.code(200).send(response);
    });
};
