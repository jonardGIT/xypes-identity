import type { FastifyInstance } from "fastify";
import type { CreateRoleBindingDependencies } from "../domain/role-binding-types.js";
export declare const registerCreateRoleBindingRoute: (app: FastifyInstance, dependencies: CreateRoleBindingDependencies) => Promise<void>;
