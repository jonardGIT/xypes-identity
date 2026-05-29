import type { ResolveSessionErrorCode } from "@xypes-identity/shared";

export interface XypesIdentityApiErrorPayload {
  error: string;
  message: string;
  statusCode: number;
  code: string;
}

export type XypesIdentityResolveSessionAvailabilityErrorCode = Extract<
  ResolveSessionErrorCode,
  "AUTH_JWKS_UNAVAILABLE" | "AUTH_TOKEN_VERIFICATION_UNAVAILABLE"
>;

const resolveSessionAvailabilityErrorCodes = new Set<XypesIdentityResolveSessionAvailabilityErrorCode>([
  "AUTH_JWKS_UNAVAILABLE",
  "AUTH_TOKEN_VERIFICATION_UNAVAILABLE",
]);

export class XypesIdentityApiError extends Error {
  readonly name = "XypesIdentityApiError";
  readonly statusCode: number;
  readonly code: string;
  readonly error: string;
  readonly payload: XypesIdentityApiErrorPayload;

  constructor(payload: XypesIdentityApiErrorPayload) {
    super(payload.message);
    this.statusCode = payload.statusCode;
    this.code = payload.code;
    this.error = payload.error;
    this.payload = payload;
  }
}

export const isXypesIdentityApiErrorPayload = (
  value: unknown,
): value is XypesIdentityApiErrorPayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.error === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.statusCode === "number" &&
    typeof candidate.code === "string"
  );
};

export const isXypesIdentityApiError = (
  value: unknown,
): value is XypesIdentityApiError => value instanceof XypesIdentityApiError;

export const isXypesIdentityResolveSessionAvailabilityErrorCode = (
  code: string,
): code is XypesIdentityResolveSessionAvailabilityErrorCode =>
  resolveSessionAvailabilityErrorCodes.has(
    code as XypesIdentityResolveSessionAvailabilityErrorCode,
  );

export const isXypesIdentityResolveSessionAvailabilityError = (
  value: unknown,
): value is XypesIdentityApiError =>
  isXypesIdentityApiError(value)
  && isXypesIdentityResolveSessionAvailabilityErrorCode(value.code);