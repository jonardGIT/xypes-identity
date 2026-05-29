import { isXypesIdentityApiError, } from "@xypes-identity/sdk";
export const mapSdkApiError = (error) => {
    if (!isXypesIdentityApiError(error)) {
        return null;
    }
    return error.payload;
};
