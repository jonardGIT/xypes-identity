import type { ListRoleDefinitionsResponse } from "@xypes-identity/shared";

import type {
  ListRoleDefinitionsDependencies,
  ListRoleDefinitionsServiceInput,
} from "../domain/role-definition-types.js";

export const listRoleDefinitions = async (
  input: ListRoleDefinitionsServiceInput,
  dependencies: ListRoleDefinitionsDependencies,
): Promise<ListRoleDefinitionsResponse> => ({
  generated_at: dependencies.clock.now().toISOString(),
  role_definitions: await dependencies.roleDefinitionRepository.listRoleDefinitions(input),
});