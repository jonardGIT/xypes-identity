import type { CreateRoleBindingErrorCode, UpdateRoleBindingStatusErrorCode } from "@xypes-identity/shared";
export declare class CreateRoleBindingError extends Error {
    readonly code: CreateRoleBindingErrorCode;
    readonly statusCode: number;
    constructor(code: CreateRoleBindingErrorCode, message: string, statusCode: number);
}
export declare class UpdateRoleBindingStatusError extends Error {
    readonly code: UpdateRoleBindingStatusErrorCode;
    readonly statusCode: number;
    constructor(code: UpdateRoleBindingStatusErrorCode, message: string, statusCode: number);
}
