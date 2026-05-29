import type { AttachRolePermissionResponse } from "@xypes-identity/shared";
import type { AttachRolePermissionDependencies, AttachRolePermissionServiceInput } from "../domain/role-permission-types.js";
export declare const attachRolePermission: (input: AttachRolePermissionServiceInput, dependencies: AttachRolePermissionDependencies) => Promise<AttachRolePermissionResponse>;
