import type { CreateRoleBindingResponse } from "@xypes-identity/shared";
import type { CreateRoleBindingDependencies, CreateRoleBindingServiceInput } from "../domain/role-binding-types.js";
export declare const createRoleBinding: (input: CreateRoleBindingServiceInput, dependencies: CreateRoleBindingDependencies) => Promise<CreateRoleBindingResponse>;
