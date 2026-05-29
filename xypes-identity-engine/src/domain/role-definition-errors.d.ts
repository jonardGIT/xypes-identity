import type { CreateRoleDefinitionErrorCode, UpdateRoleDefinitionStatusErrorCode } from "@xypes-identity/shared";
export declare class CreateRoleDefinitionError extends Error {
    readonly code: CreateRoleDefinitionErrorCode;
    readonly statusCode: number;
    constructor(code: CreateRoleDefinitionErrorCode, message: string, statusCode: number);
}
export declare class UpdateRoleDefinitionStatusError extends Error {
    readonly code: UpdateRoleDefinitionStatusErrorCode;
    readonly statusCode: number;
    constructor(code: UpdateRoleDefinitionStatusErrorCode, message: string, statusCode: number);
}
