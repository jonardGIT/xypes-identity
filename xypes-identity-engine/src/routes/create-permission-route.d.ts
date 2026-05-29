import type { FastifyInstance } from "fastify";
import type { CreatePermissionDependencies } from "../domain/permission-types.js";
export declare const registerCreatePermissionRoute: (app: FastifyInstance, dependencies: CreatePermissionDependencies) => Promise<void>;
