import type { FastifyInstance } from "fastify";
import type { UpdateRoleBindingStatusDependencies } from "../domain/role-binding-types.js";
export declare const registerUpdateRoleBindingStatusRoute: (app: FastifyInstance, dependencies: UpdateRoleBindingStatusDependencies) => Promise<void>;
