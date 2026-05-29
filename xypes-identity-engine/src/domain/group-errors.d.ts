import type { CreateGroupErrorCode } from "@xypes-identity/shared";
export declare class CreateGroupError extends Error {
    readonly code: CreateGroupErrorCode;
    readonly statusCode: number;
    constructor(code: CreateGroupErrorCode, message: string, statusCode: number);
}
