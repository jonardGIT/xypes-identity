import type { FastifyInstance } from "fastify";
import type { CreateRoleDefinitionDependencies } from "../domain/role-definition-types.js";
export declare const registerCreateRoleDefinitionRoute: (app: FastifyInstance, dependencies: CreateRoleDefinitionDependencies) => Promise<void>;
