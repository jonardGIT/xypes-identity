import type { CreatePermissionErrorCode } from "@xypes-identity/shared";
export declare class CreatePermissionError extends Error {
    readonly code: CreatePermissionErrorCode;
    readonly statusCode: number;
    constructor(code: CreatePermissionErrorCode, message: string, statusCode: number);
}
