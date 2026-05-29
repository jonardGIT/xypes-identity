import type { UpdateRoleDefinitionStatusResponse } from "@xypes-identity/shared";
import type { UpdateRoleDefinitionStatusDependencies, UpdateRoleDefinitionStatusServiceInput } from "../domain/role-definition-types.js";
export declare const updateRoleDefinitionStatus: (input: UpdateRoleDefinitionStatusServiceInput, dependencies: UpdateRoleDefinitionStatusDependencies) => Promise<UpdateRoleDefinitionStatusResponse>;
