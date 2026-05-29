import type { CreateGroupMembershipResponse } from "@xypes-identity/shared";
import type { CreateGroupMembershipDependencies, CreateGroupMembershipServiceInput } from "../domain/group-membership-types.js";
export declare const createGroupMembership: (input: CreateGroupMembershipServiceInput, dependencies: CreateGroupMembershipDependencies) => Promise<CreateGroupMembershipResponse>;
