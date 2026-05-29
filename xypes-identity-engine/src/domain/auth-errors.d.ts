import type { ResolveSessionErrorCode } from "@xypes-identity/shared";
export declare class ResolveSessionError extends Error {
    readonly code: ResolveSessionErrorCode;
    readonly statusCode: number;
    constructor(code: ResolveSessionErrorCode, message: string, statusCode: number);
}
