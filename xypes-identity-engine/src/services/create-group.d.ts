import type { CreateGroupResponse } from "@xypes-identity/shared";
import type { CreateGroupDependencies, CreateGroupServiceInput } from "../domain/group-types.js";
export declare const createGroup: (input: CreateGroupServiceInput, dependencies: CreateGroupDependencies) => Promise<CreateGroupResponse>;
