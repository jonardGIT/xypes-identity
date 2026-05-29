import type { AttachRolePermissionErrorCode } from "@xypes-identity/shared";
export declare class AttachRolePermissionError extends Error {
    readonly code: AttachRolePermissionErrorCode;
    readonly statusCode: number;
    constructor(code: AttachRolePermissionErrorCode, message: string, statusCode: number);
}
