import type { XypesIdentityClient } from "@xypes-identity/sdk";
import type { FastifyInstance } from "fastify";
export type AccessReviewClient = Pick<XypesIdentityClient["accessReviews"], "listFindings">;
export interface AccessReviewRouteDependencies {
    accessReviews: AccessReviewClient;
}
export declare const registerAccessReviewRoutes: (app: FastifyInstance, dependencies: AccessReviewRouteDependencies) => Promise<void>;
