import type { FastifyInstance } from "fastify";
import type { ListAccessReviewFindingsDependencies } from "../domain/access-review-types.js";
export declare const registerAccessReviewFindingsRoute: (app: FastifyInstance, dependencies: ListAccessReviewFindingsDependencies) => Promise<void>;
