import type { ListPermissionsResponse } from "@xypes-identity/shared";

import type {
  ListPermissionsDependencies,
  ListPermissionsServiceInput,
} from "../domain/permission-types.js";

export const listPermissions = async (
  input: ListPermissionsServiceInput,
  dependencies: ListPermissionsDependencies,
): Promise<ListPermissionsResponse> => ({
  generated_at: dependencies.clock.now().toISOString(),
  permissions: await dependencies.permissionRepository.listPermissions(input),
});