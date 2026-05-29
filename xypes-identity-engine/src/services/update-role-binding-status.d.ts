import type { UpdateRoleBindingStatusResponse } from "@xypes-identity/shared";
import type { UpdateRoleBindingStatusDependencies, UpdateRoleBindingStatusServiceInput } from "../domain/role-binding-types.js";
export declare const updateRoleBindingStatus: (input: UpdateRoleBindingStatusServiceInput, dependencies: UpdateRoleBindingStatusDependencies) => Promise<UpdateRoleBindingStatusResponse>;
