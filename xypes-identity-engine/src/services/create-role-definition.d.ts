import type { CreateRoleDefinitionResponse } from "@xypes-identity/shared";
import type { CreateRoleDefinitionDependencies, CreateRoleDefinitionServiceInput } from "../domain/role-definition-types.js";
export declare const createRoleDefinition: (input: CreateRoleDefinitionServiceInput, dependencies: CreateRoleDefinitionDependencies) => Promise<CreateRoleDefinitionResponse>;
