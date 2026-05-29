import assert from "node:assert/strict";
import test from "node:test";
import { buildApp as buildAdminApp } from "../../xypes-identity-admin/src/app.js";
import { buildApp as buildEngineApp } from "../../xypes-identity-engine/src/app.js";
import { XypesIdentityAuthorizationDeniedError, createExpressAuthorizationMiddleware, createExpressSessionMiddleware, createFastifyAuthorizationHook, createFastifySessionHook, createXypesIdentityClient, } from "../src/index.js";
const createJsonResponse = (body, status) => new Response(JSON.stringify(body), {
    status,
    headers: {
        "content-type": "application/json",
    },
});
const headersToObject = (headers) => {
    const normalizedHeaders = {};
    if (headers === undefined) {
        return normalizedHeaders;
    }
    const iteratedHeaders = new Headers(headers);
    iteratedHeaders.forEach((value, key) => {
        normalizedHeaders[key] = value;
    });
    return normalizedHeaders;
};
const normalizeInjectedHeaders = (headers) => {
    const normalizedHeaders = {};
    for (const [key, value] of Object.entries(headers)) {
        if (value === undefined) {
            continue;
        }
        normalizedHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
    }
    return normalizedHeaders;
};
const createInjectedFetch = (app) => async (input, init) => {
    const url = new URL(String(input));
    const response = await app.inject({
        method: init?.method ?? "GET",
        url: `${url.pathname}${url.search}`,
        payload: init?.body === undefined ? undefined : String(init.body),
        headers: headersToObject(init?.headers),
    });
    return new Response(response.body, {
        status: response.statusCode,
        headers: normalizeInjectedHeaders(response.headers),
    });
};
test("Fastify sample flow resolves session then stores an allow decision on the request", async () => {
    const calledPaths = [];
    const client = createXypesIdentityClient({
        baseUrl: "https://engine.example.test",
        fetch: async (input, init) => {
            calledPaths.push(String(input));
            if (String(input).endsWith("/v1/auth/resolve-session")) {
                assert.deepEqual(JSON.parse(String(init?.body)), {
                    tenant_id: "tenant-fastify",
                    token: "fastify-token",
                });
                return createJsonResponse({
                    decision_id: "session_decision_fastify",
                    principal: {
                        principal_id: "principal_fastify",
                        tenant_id: "tenant-fastify",
                        subject: "fastify@example.com",
                        email: "fastify@example.com",
                        principal_status: "active",
                        membership_status: "active",
                    },
                }, 200);
            }
            assert.ok(String(input).endsWith("/v1/authorize/check"));
            assert.deepEqual(JSON.parse(String(init?.body)), {
                tenant_id: "tenant-fastify",
                principal_id: "principal_fastify",
                application_id: "billing-app",
                action: "invoices.read",
                resource_type: "invoice",
                resource_id: "inv_123",
            });
            return createJsonResponse({
                outcome: "allow",
                decision_id: "authz_decision_fastify",
                reason_code: "ALLOW_MATCHED_BINDING",
                matched_bindings: [
                    {
                        role_binding_id: "binding_123",
                        role_definition_id: "role_123",
                        permission_id: "permission_123",
                        scope_type: "resource",
                        scope_application_id: "billing-app",
                        scope_resource_type: "invoice",
                        scope_resource_id: "inv_123",
                    },
                ],
                deny_source: null,
            }, 200);
        },
    });
    const sessionHook = createFastifySessionHook({
        client,
        resolveTenantId: (request) => request.params.tenantId,
        resolveToken: (request) => request.headers.authorization.replace(/^Bearer\s+/i, ""),
    });
    const authorizationHook = createFastifyAuthorizationHook({
        client,
        resolveApplicationId: () => "billing-app",
        resolveAction: () => "invoices.read",
        resolveResourceType: () => "invoice",
        resolveResourceId: (request) => request.params.invoiceId,
    });
    const request = {
        headers: { authorization: "Bearer fastify-token" },
        params: { tenantId: "tenant-fastify", invoiceId: "inv_123" },
    };
    await sessionHook(request, {});
    await authorizationHook(request, {});
    assert.equal(calledPaths.length, 2);
    assert.equal(request.xypesIdentity?.decision_id, "session_decision_fastify");
    assert.equal(request.xypesIdentity?.principal.principal_id, "principal_fastify");
    assert.equal(request.xypesIdentityAuthorization?.decision_id, "authz_decision_fastify");
    assert.equal(request.xypesIdentityAuthorization?.outcome, "allow");
});
test("Express sample flow forwards a deny error with request-local authorization context", async () => {
    const client = createXypesIdentityClient({
        baseUrl: "https://engine.example.test",
        fetch: async (input, init) => {
            if (String(input).endsWith("/v1/auth/resolve-session")) {
                assert.deepEqual(JSON.parse(String(init?.body)), {
                    tenant_id: "tenant-express",
                    token: "express-token",
                });
                return createJsonResponse({
                    decision_id: "session_decision_express",
                    principal: {
                        principal_id: "principal_express",
                        tenant_id: "tenant-express",
                        subject: "express@example.com",
                        email: null,
                        principal_status: "active",
                        membership_status: "active",
                    },
                }, 200);
            }
            assert.ok(String(input).endsWith("/v1/authorize/check"));
            assert.deepEqual(JSON.parse(String(init?.body)), {
                tenant_id: "tenant-express",
                principal_id: "principal_express",
                application_id: "billing-app",
                action: "invoices.read",
                resource_type: "invoice",
                resource_id: "inv_456",
            });
            return createJsonResponse({
                outcome: "deny",
                decision_id: "authz_decision_express",
                reason_code: "NO_MATCHING_BINDING",
                matched_bindings: [],
                deny_source: null,
            }, 200);
        },
    });
    const sessionMiddleware = createExpressSessionMiddleware({
        client,
        resolveTenantId: (request) => request.params.tenantId,
        resolveToken: (request) => request.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "",
    });
    const authorizationMiddleware = createExpressAuthorizationMiddleware({
        client,
        resolveApplicationId: () => "billing-app",
        resolveAction: () => "invoices.read",
        resolveResourceType: () => "invoice",
        resolveResourceId: (request) => request.params.invoiceId,
    });
    const request = {
        params: { tenantId: "tenant-express", invoiceId: "inv_456" },
        header(name) {
            return name.toLowerCase() === "authorization" ? "Bearer express-token" : undefined;
        },
    };
    await new Promise((resolve, reject) => {
        sessionMiddleware(request, {}, (error) => {
            if (error !== undefined) {
                reject(error);
                return;
            }
            resolve();
        });
    });
    await new Promise((resolve, reject) => {
        authorizationMiddleware(request, {}, (error) => {
            try {
                assert.ok(error instanceof XypesIdentityAuthorizationDeniedError);
                assert.equal(error.decisionId, "authz_decision_express");
                assert.equal(error.reasonCode, "NO_MATCHING_BINDING");
                assert.equal(request.xypesIdentity?.decision_id, "session_decision_express");
                assert.equal(request.xypesIdentityAuthorization?.decision_id, "authz_decision_express");
                assert.equal(request.xypesIdentityAuthorization?.outcome, "deny");
                resolve();
            }
            catch (assertionError) {
                reject(assertionError);
            }
        });
    });
});
test("Governance flow uses the SDK through admin against engine routes for workbench review and approval activation", async (t) => {
    let currentRoleBindingStatus = "eligible";
    const auditEventIds = ["audit_activation_123", "outbox_activation_123"];
    const auditEvents = [];
    const engineApp = await buildEngineApp({
        accessReviewRead: {
            accessReviewRepository: {
                async listFindings(input) {
                    const finding = {
                        finding_id: "PRIVILEGED_ROLE_BINDING:binding_123",
                        code: "PRIVILEGED_ROLE_BINDING",
                        severity: "high",
                        entity_type: "role_binding",
                        entity_id: "binding_123",
                        title: "Privileged access requires review",
                        detail: "The binding remains eligible until an approver activates it.",
                        evidence_ids: ["binding_123", "role_123", "permission_123"],
                        observed_at: "2026-05-28T10:00:00.000Z",
                        scope_type: "application",
                        scope_application_id: "app_123",
                        scope_resource_type: null,
                        scope_resource_id: null,
                        owner_principal_id: null,
                        subject_principal_id: "principal_123",
                        subject_group_id: null,
                        role_binding_status: currentRoleBindingStatus,
                        role_definition_id: "role_123",
                        role_definition_name: "Finance Approver",
                        role_definition_status: "active",
                        approval_required: true,
                        permission_ids: ["permission_123"],
                    };
                    if (input.finding_codes !== undefined
                        && input.finding_codes.includes("PRIVILEGED_ROLE_BINDING") === false) {
                        return [];
                    }
                    return [finding];
                },
            },
            clock: {
                now: () => new Date("2026-05-28T10:15:00.000Z"),
            },
        },
        auditRead: {
            auditEventRepository: {
                async listEvents(input) {
                    return auditEvents
                        .filter((event) => input.entity_id === undefined || event.entity_id === input.entity_id)
                        .filter((event) => (input.event_types === undefined
                        || input.event_types.includes(event.event_type)))
                        .slice(0, input.limit);
                },
            },
            clock: {
                now: () => new Date("2026-05-28T10:20:00.000Z"),
            },
        },
        roleBindingStatusUpdate: {
            roleBindingRepository: {
                async createRoleBinding() {
                    throw new Error("Unexpected createRoleBinding call");
                },
                async updateRoleBindingStatus(input) {
                    const previousStatus = currentRoleBindingStatus;
                    currentRoleBindingStatus = input.role_binding_status;
                    auditEvents.unshift({
                        audit_event_id: input.audit_event_id,
                        tenant_id: input.tenant_id,
                        event_type: "role_binding.status_updated",
                        entity_type: "role_binding",
                        entity_id: input.role_binding_id,
                        actor_principal_id: input.actor_principal_id,
                        actor_subject: input.actor_subject,
                        reason: input.reason,
                        before_payload: { role_binding_status: previousStatus },
                        after_payload: { role_binding_status: input.role_binding_status },
                        correlation_id: input.correlation_id,
                        reference_type: "role_definition",
                        reference_id: "role_123",
                        occurred_at: input.occurred_at,
                    });
                    return {
                        role_binding_id: input.role_binding_id,
                        tenant_id: input.tenant_id,
                        role_definition_id: "role_123",
                        role_binding_status: input.role_binding_status,
                        subject_principal_id: "principal_123",
                        subject_group_id: null,
                        scope_type: "application",
                        scope_application_id: "app_123",
                        scope_resource_type: null,
                        scope_resource_id: null,
                        created_at: "2026-05-28T09:55:00.000Z",
                        updated_at: input.occurred_at,
                        created_by: "admin@example.com",
                        updated_by: input.actor_subject,
                    };
                },
            },
            idGenerator: {
                nextId: () => auditEventIds.shift() ?? "unexpected-id",
            },
            clock: {
                now: () => new Date("2026-05-28T10:16:00.000Z"),
            },
        },
    });
    const client = createXypesIdentityClient({
        baseUrl: "https://engine.example.test",
        fetch: createInjectedFetch(engineApp),
    });
    const adminApp = await buildAdminApp({
        audit: client.audit,
        accessReviews: client.accessReviews,
        controlPlane: client.controlPlane,
        logger: false,
    });
    t.after(async () => {
        await adminApp.close();
        await engineApp.close();
    });
    const workbenchBefore = await adminApp.inject({
        method: "POST",
        url: "/admin/access-reviews/workbench",
        payload: {
            tenant_id: "tenant_123",
            stale_after_days: 30,
            finding_codes: ["PRIVILEGED_ROLE_BINDING"],
            limit: 10,
        },
    });
    assert.equal(workbenchBefore.statusCode, 200);
    assert.equal(workbenchBefore.json().summary.approval_activation_candidates, 1);
    assert.equal(workbenchBefore.json().approval_activation_candidates[0]?.entity_id, "binding_123");
    assert.equal(workbenchBefore.json().sections[0]?.findings[0]?.role_binding_status, "eligible");
    const activationResponse = await adminApp.inject({
        method: "PATCH",
        url: "/admin/role-bindings/binding_123/status",
        payload: {
            tenant_id: "tenant_123",
            role_binding_status: "active",
            actor_principal_id: "principal_approver",
            actor_subject: "approver@example.com",
            reason: "Approval completed",
        },
    });
    assert.equal(activationResponse.statusCode, 200);
    assert.equal(activationResponse.json().role_binding.role_binding_status, "active");
    assert.equal(activationResponse.json().audit.audit_event_id, "audit_activation_123");
    const workbenchAfter = await adminApp.inject({
        method: "POST",
        url: "/admin/access-reviews/workbench",
        payload: {
            tenant_id: "tenant_123",
            stale_after_days: 30,
            finding_codes: ["PRIVILEGED_ROLE_BINDING"],
            limit: 10,
        },
    });
    assert.equal(workbenchAfter.statusCode, 200);
    assert.equal(workbenchAfter.json().summary.approval_activation_candidates, 0);
    assert.equal(workbenchAfter.json().sections[0]?.findings[0]?.role_binding_status, "active");
    const auditResponse = await adminApp.inject({
        method: "POST",
        url: "/admin/audit-events/query",
        payload: {
            tenant_id: "tenant_123",
            event_types: ["role_binding.status_updated"],
            entity_type: "role_binding",
            entity_id: "binding_123",
            limit: 10,
        },
    });
    assert.equal(auditResponse.statusCode, 200);
    assert.equal(auditResponse.json().events[0]?.before_payload.role_binding_status, "eligible");
    assert.equal(auditResponse.json().events[0]?.after_payload.role_binding_status, "active");
    assert.equal(auditResponse.json().events[0]?.actor_subject, "approver@example.com");
});
