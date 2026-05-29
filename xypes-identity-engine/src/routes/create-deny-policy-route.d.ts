import type { FastifyInstance } from "fastify";
import type { CreateDenyPolicyDependencies } from "../domain/deny-policy-types.js";
export declare const registerCreateDenyPolicyRoute: (app: FastifyInstance, dependencies: CreateDenyPolicyDependencies) => Promise<void>;
