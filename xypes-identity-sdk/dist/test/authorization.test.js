import assert from "node:assert/strict";
import test from "node:test";
import { XypesIdentityAuthorizationDeniedError, authorizeRequest, createExpressAuthorizationMiddleware, createFastifyAuthorizationHook, createXypesIdentityClient, isXypesIdentityAuthorizationDeniedError, } from "../src/index.js";
const createJsonResponse = (body, status) => new Response(JSON.stringify(body), {
    status,
    headers: {
        "content-type": "application/json",
    },
});
test("authorizeRequest uses the resolved session and stores the allow decision on the request", async () => {
    let capturedAuthorizeRequest;
    const client = createXypesIdentityClient({
        baseUrl: "https://engine.example.test",
        fetch: async (_input, init) => {
            capturedAuthorizeRequest = JSON.parse(String(init?.body));
            return createJsonResponse({
                outcome: "allow",
                decision_id: "dec_allow",
                reason_code: "ALLOW_MATCHED_BINDING",
                matched_bindings: [
                    {
                        role_binding_id: "binding_123",
                        role_definition_id: "role_123",
                        permission_id: "permission_123",
                        scope_type: "resource",
                        scope_application_id: "app_123",
                        scope_resource_type: "invoice",
                        scope_resource_id: "invoice_123",
                    },
                ],
                deny_source: null,
            }, 200);
        },
    });
    const request = {
        params: { invoiceId: "invoice_123" },
        xypesIdentity: {
            decision_id: "dec_session",
            principal: {
                principal_id: "principal_123",
                tenant_id: "tenant_123",
                subject: "user@example.com",
                email: "user@example.com",
                principal_status: "active",
                membership_status: "active",
            },
        },
    };
    const decision = await authorizeRequest(request, {
        client,
        resolveApplicationId: () => "app_123",
        resolveAction: () => "invoices.approve",
        resolveResourceType: () => "invoice",
        resolveResourceId: (currentRequest) => currentRequest.params.invoiceId,
    });
    assert.deepEqual(capturedAuthorizeRequest, {
        tenant_id: "tenant_123",
        principal_id: "principal_123",
        application_id: "app_123",
        action: "invoices.approve",
        resource_type: "invoice",
        resource_id: "invoice_123",
    });
    assert.equal(decision.outcome, "allow");
    assert.equal(decision.decision_id, "dec_allow");
    assert.deepEqual(request.xypesIdentityAuthorization, decision);
});
test("authorizeRequest requires a resolved session before calling authorize.check", async () => {
    const client = createXypesIdentityClient({
        baseUrl: "https://engine.example.test",
        fetch: async () => {
            throw new Error("authorize.check should not be called without a session");
        },
    });
    await assert.rejects(() => authorizeRequest({ params: {}, xypesIdentityAuthorization: undefined }, {
        client,
        resolveApplicationId: () => "app_123",
        resolveAction: () => "invoices.read",
        resolveResourceType: () => "invoice",
    }), (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /session is required before authorization/i);
        return true;
    });
});
test("createFastifyAuthorizationHook throws a typed deny error and preserves the decision on the request", async () => {
    const client = createXypesIdentityClient({
        baseUrl: "https://engine.example.test",
        fetch: async () => createJsonResponse({
            outcome: "deny",
            decision_id: "dec_deny_fastify",
            reason_code: "DENY_MATCHED_POLICY",
            matched_bindings: [],
            deny_source: {
                deny_policy_id: "deny_123",
                permission_id: "permission_123",
                scope_type: "resource",
                scope_application_id: "app_123",
                scope_resource_type: "invoice",
                scope_resource_id: "invoice_123",
                reason: "Finance holds require second approval",
            },
        }, 200),
    });
    const hook = createFastifyAuthorizationHook({
        client,
        resolveApplicationId: () => "app_123",
        resolveAction: () => "invoices.approve",
        resolveResourceType: () => "invoice",
        resolveResourceId: (request) => request.params.invoiceId,
    });
    const request = {
        params: { invoiceId: "invoice_123" },
        xypesIdentity: {
            decision_id: "dec_session",
            principal: {
                principal_id: "principal_123",
                tenant_id: "tenant_123",
                subject: "user@example.com",
                email: "user@example.com",
                principal_status: "active",
                membership_status: "active",
            },
        },
    };
    await assert.rejects(() => hook(request, {}), (error) => {
        assert.ok(error instanceof XypesIdentityAuthorizationDeniedError);
        assert.ok(isXypesIdentityAuthorizationDeniedError(error));
        assert.equal(error.decisionId, "dec_deny_fastify");
        assert.equal(error.reasonCode, "DENY_MATCHED_POLICY");
        assert.deepEqual(request.xypesIdentityAuthorization, error.authorization);
        return true;
    });
});
test("createExpressAuthorizationMiddleware forwards deny errors to next with the request-local decision", async () => {
    const client = createXypesIdentityClient({
        baseUrl: "https://engine.example.test",
        fetch: async () => createJsonResponse({
            outcome: "deny",
            decision_id: "dec_deny_express",
            reason_code: "NO_MATCHING_BINDING",
            matched_bindings: [],
            deny_source: null,
        }, 200),
    });
    const middleware = createExpressAuthorizationMiddleware({
        client,
        resolveApplicationId: () => "app_123",
        resolveAction: (request) => request.routeAction,
        resolveResourceType: () => "invoice",
        resolveResourceId: (request) => request.params.invoiceId,
    });
    const request = {
        params: { invoiceId: "invoice_456" },
        routeAction: "invoices.read",
        xypesIdentity: {
            decision_id: "dec_session",
            principal: {
                principal_id: "principal_456",
                tenant_id: "tenant_456",
                subject: "reader@example.com",
                email: null,
                principal_status: "active",
                membership_status: "active",
            },
        },
    };
    await new Promise((resolve, reject) => {
        middleware(request, {}, (error) => {
            try {
                assert.ok(error instanceof XypesIdentityAuthorizationDeniedError);
                assert.equal(error.decisionId, "dec_deny_express");
                assert.equal(error.reasonCode, "NO_MATCHING_BINDING");
                assert.deepEqual(request.xypesIdentityAuthorization, error.authorization);
                resolve();
            }
            catch (assertionError) {
                reject(assertionError);
            }
        });
    });
});
