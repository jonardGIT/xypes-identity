import assert from "node:assert/strict";
import test from "node:test";
import { XypesIdentityApiError } from "@xypes-identity/sdk";
import { mapSdkApiError } from "./error-mapping.js";
test("mapSdkApiError returns the SDK payload verbatim", () => {
    const error = new XypesIdentityApiError({
        error: "Create Role Binding Error",
        message: "The requested role binding is blocked by a toxic role combination with existing role binding binding-existing. Finance approvers cannot also request vendor payments.",
        statusCode: 409,
        code: "ROLE_BINDING_SOD_CONFLICT",
    });
    assert.strictEqual(mapSdkApiError(error), error.payload);
});
test("mapSdkApiError returns null for non-SDK errors", () => {
    assert.equal(mapSdkApiError(new Error("boom")), null);
});
