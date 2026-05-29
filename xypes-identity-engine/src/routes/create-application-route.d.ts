import type { FastifyInstance } from "fastify";
import type { CreateApplicationDependencies } from "../domain/application-types.js";
export declare const registerCreateApplicationRoute: (app: FastifyInstance, dependencies: CreateApplicationDependencies) => Promise<void>;
