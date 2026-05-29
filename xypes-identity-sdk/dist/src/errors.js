const resolveSessionAvailabilityErrorCodes = new Set([
    "AUTH_JWKS_UNAVAILABLE",
    "AUTH_TOKEN_VERIFICATION_UNAVAILABLE",
]);
export class XypesIdentityApiError extends Error {
    name = "XypesIdentityApiError";
    statusCode;
    code;
    error;
    payload;
    constructor(payload) {
        super(payload.message);
        this.statusCode = payload.statusCode;
        this.code = payload.code;
        this.error = payload.error;
        this.payload = payload;
    }
}
export const isXypesIdentityApiErrorPayload = (value) => {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const candidate = value;
    return (typeof candidate.error === "string" &&
        typeof candidate.message === "string" &&
        typeof candidate.statusCode === "number" &&
        typeof candidate.code === "string");
};
export const isXypesIdentityApiError = (value) => value instanceof XypesIdentityApiError;
export const isXypesIdentityResolveSessionAvailabilityErrorCode = (code) => resolveSessionAvailabilityErrorCodes.has(code);
export const isXypesIdentityResolveSessionAvailabilityError = (value) => isXypesIdentityApiError(value)
    && isXypesIdentityResolveSessionAvailabilityErrorCode(value.code);
