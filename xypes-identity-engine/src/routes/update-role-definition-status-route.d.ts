import type { FastifyInstance } from "fastify";
import type { UpdateRoleDefinitionStatusDependencies } from "../domain/role-definition-types.js";
export declare const registerUpdateRoleDefinitionStatusRoute: (app: FastifyInstance, dependencies: UpdateRoleDefinitionStatusDependencies) => Promise<void>;
