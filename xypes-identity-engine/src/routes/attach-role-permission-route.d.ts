import type { FastifyInstance } from "fastify";
import type { AttachRolePermissionDependencies } from "../domain/role-permission-types.js";
export declare const registerAttachRolePermissionRoute: (app: FastifyInstance, dependencies: AttachRolePermissionDependencies) => Promise<void>;
