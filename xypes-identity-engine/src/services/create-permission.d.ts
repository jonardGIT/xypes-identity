import type { CreatePermissionResponse } from "@xypes-identity/shared";
import type { CreatePermissionDependencies, CreatePermissionServiceInput } from "../domain/permission-types.js";
export declare const createPermission: (input: CreatePermissionServiceInput, dependencies: CreatePermissionDependencies) => Promise<CreatePermissionResponse>;
