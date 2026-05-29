import { type XypesIdentityApiErrorPayload } from "@xypes-identity/sdk";
export interface AdminApiErrorBody extends XypesIdentityApiErrorPayload {
}
export declare const mapSdkApiError: (error: unknown) => AdminApiErrorBody | null;
