import type { CreateDenyPolicyErrorCode } from "@xypes-identity/shared";
export declare class CreateDenyPolicyError extends Error {
    readonly code: CreateDenyPolicyErrorCode;
    readonly statusCode: number;
    constructor(code: CreateDenyPolicyErrorCode, message: string, statusCode: number);
}
