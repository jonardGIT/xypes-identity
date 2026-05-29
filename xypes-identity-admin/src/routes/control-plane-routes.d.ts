import type { XypesIdentityClient } from "@xypes-identity/sdk";
import type { FastifyInstance } from "fastify";
export type ControlPlaneClient = Pick<XypesIdentityClient["controlPlane"], "attachRolePermission" | "createApplication" | "createDenyPolicy" | "createGroup" | "createGroupMembership" | "createPermission" | "createRoleBinding" | "updateRoleBindingStatus">;
export interface ControlPlaneRouteDependencies {
    controlPlane: ControlPlaneClient;
}
export declare const registerControlPlaneRoutes: (app: FastifyInstance, dependencies: ControlPlaneRouteDependencies) => Promise<void>;
