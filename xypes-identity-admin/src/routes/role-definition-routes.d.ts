import type { XypesIdentityClient } from "@xypes-identity/sdk";
import type { FastifyInstance } from "fastify";
export type RoleDefinitionControlPlaneClient = Pick<XypesIdentityClient["controlPlane"], "createRoleDefinition" | "updateRoleDefinitionStatus">;
export interface RoleDefinitionRouteDependencies {
    controlPlane: RoleDefinitionControlPlaneClient;
}
export declare const registerRoleDefinitionRoutes: (app: FastifyInstance, dependencies: RoleDefinitionRouteDependencies) => Promise<void>;
