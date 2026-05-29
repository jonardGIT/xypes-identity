import type { FastifyInstance } from "fastify";
import { type AuthorizeExplainServiceDependencies } from "../services/authorize-explain.js";
export interface AuthorizeExplainRouteDependencies extends AuthorizeExplainServiceDependencies {
}
export declare const registerAuthorizeExplainRoute: (app: FastifyInstance, dependencies: AuthorizeExplainRouteDependencies) => Promise<void>;
