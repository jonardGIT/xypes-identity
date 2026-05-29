import type { CreateApplicationErrorCode } from "@xypes-identity/shared";
export declare class CreateApplicationError extends Error {
    readonly code: CreateApplicationErrorCode;
    readonly statusCode: number;
    constructor(code: CreateApplicationErrorCode, message: string, statusCode: number);
}
