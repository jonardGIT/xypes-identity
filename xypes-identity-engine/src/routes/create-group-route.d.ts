import type { FastifyInstance } from "fastify";
import type { CreateGroupDependencies } from "../domain/group-types.js";
export declare const registerCreateGroupRoute: (app: FastifyInstance, dependencies: CreateGroupDependencies) => Promise<void>;
