import type { OperationalTelemetrySnapshot } from "@xypes-identity/shared";
import type { FastifyInstance } from "fastify";

import type { OperationalTelemetryRecorder } from "../domain/operational-telemetry-types.js";
import type { Clock } from "../domain/session-types.js";

export interface OperationsTelemetryRouteDependencies {
  operationalTelemetry: OperationalTelemetryRecorder;
  clock: Clock;
}

export const registerOperationsTelemetryRoute = async (
  app: FastifyInstance,
  dependencies: OperationsTelemetryRouteDependencies,
): Promise<void> => {
  app.get(
    "/v1/operations/telemetry",
    async (_request, reply) => {
      const response = await dependencies.operationalTelemetry.getSnapshot(
        dependencies.clock.now().toISOString(),
      );

      return reply.code(200).send(response satisfies OperationalTelemetrySnapshot);
    },
  );
};