import {
  isXypesIdentityApiError,
  type XypesIdentityApiErrorPayload,
} from "@xypes-identity/sdk";

export interface AdminApiErrorBody extends XypesIdentityApiErrorPayload {}

export const mapSdkApiError = (error: unknown): AdminApiErrorBody | null => {
  if (!isXypesIdentityApiError(error)) {
    return null;
  }

  return error.payload;
};