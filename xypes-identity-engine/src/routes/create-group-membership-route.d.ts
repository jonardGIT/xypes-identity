import type { FastifyInstance } from "fastify";
import type { CreateGroupMembershipDependencies } from "../domain/group-membership-types.js";
export declare const registerCreateGroupMembershipRoute: (app: FastifyInstance, dependencies: CreateGroupMembershipDependencies) => Promise<void>;
