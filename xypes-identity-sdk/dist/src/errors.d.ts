import type { ResolveSessionErrorCode } from "@xypes-identity/shared";
export interface XypesIdentityApiErrorPayload {
    error: string;
    message: string;
    statusCode: number;
    code: string;
}
export type XypesIdentityResolveSessionAvailabilityErrorCode = Extract<ResolveSessionErrorCode, "AUTH_JWKS_UNAVAILABLE" | "AUTH_TOKEN_VERIFICATION_UNAVAILABLE">;
export declare class XypesIdentityApiError extends Error {
    readonly name = "XypesIdentityApiError";
    readonly statusCode: number;
    readonly code: string;
    readonly error: string;
    readonly payload: XypesIdentityApiErrorPayload;
    constructor(payload: XypesIdentityApiErrorPayload);
}
export declare const isXypesIdentityApiErrorPayload: (value: unknown) => value is XypesIdentityApiErrorPayload;
export declare const isXypesIdentityApiError: (value: unknown) => value is XypesIdentityApiError;
export declare const isXypesIdentityResolveSessionAvailabilityErrorCode: (code: string) => code is XypesIdentityResolveSessionAvailabilityErrorCode;
export declare const isXypesIdentityResolveSessionAvailabilityError: (value: unknown) => value is XypesIdentityApiError;
