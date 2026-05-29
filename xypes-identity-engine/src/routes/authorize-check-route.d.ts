import type { FastifyInstance } from "fastify";
import { type AuthorizeCheckServiceDependencies } from "../services/authorize-check.js";
export interface AuthorizeCheckRouteDependencies extends AuthorizeCheckServiceDependencies {
}
export declare const registerAuthorizeCheckRoute: (app: FastifyInstance, dependencies: AuthorizeCheckRouteDependencies) => Promise<void>;
