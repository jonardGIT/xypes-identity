import type { FastifyInstance } from "fastify";
import type { ResolveSessionDependencies } from "../domain/session-types.js";
export declare const registerResolveSessionRoute: (app: FastifyInstance, dependencies: ResolveSessionDependencies) => Promise<void>;
