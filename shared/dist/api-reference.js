export const coreApiReferenceDocument = {
    endpoints: [
        {
            operation_id: "resolveSession",
            method: "POST",
            path: "/v1/auth/resolve-session",
            summary: "Resolve the caller's upstream identity into a tenant-scoped internal principal context.",
            request_examples: [
                {
                    name: "resolve-session request",
                    payload: {
                        token: "<supabase-access-token>",
                        tenant_id: "tenant_123",
                    },
                },
            ],
            success_examples: [
                {
                    name: "resolve-session success",
                    payload: {
                        decision_id: "decision_123",
                        principal: {
                            principal_id: "principal_123",
                            tenant_id: "tenant_123",
                            subject: "user@example.com",
                            email: "user@example.com",
                            principal_status: "active",
                            membership_status: "active",
                        },
                    },
                },
            ],
            error_codes: [
                "AUTH_INVALID_TOKEN",
                "AUTH_TOKEN_EXPIRED",
                "AUTH_JWKS_UNAVAILABLE",
                "AUTH_TOKEN_VERIFICATION_UNAVAILABLE",
                "AUTH_PRINCIPAL_NOT_FOUND",
                "AUTH_PRINCIPAL_SUSPENDED",
                "AUTH_TENANT_MEMBERSHIP_NOT_FOUND",
                "AUTH_TENANT_MEMBERSHIP_SUSPENDED",
            ],
            notes: [
                "The bearer token is forwarded unchanged from the upstream identity provider.",
                "Tenant context is explicit and must not be inferred from the subject alone.",
            ],
        },
        {
            operation_id: "authorizeCheck",
            method: "POST",
            path: "/v1/authorize/check",
            summary: "Return the authoritative allow or deny decision for one tenant-scoped action.",
            request_examples: [
                {
                    name: "authorize-check request",
                    payload: {
                        tenant_id: "tenant_123",
                        principal_id: "principal_123",
                        application_id: "docs-app",
                        action: "documents.read",
                        resource_type: "document",
                        resource_id: "doc_123",
                    },
                },
            ],
            success_examples: [
                {
                    name: "authorize-check allow",
                    payload: {
                        outcome: "allow",
                        decision_id: "decision_456",
                        reason_code: "ALLOW_MATCHED_BINDING",
                        matched_bindings: [
                            {
                                role_binding_id: "binding_123",
                                role_definition_id: "role_123",
                                permission_id: "permission_123",
                                scope_type: "resource",
                                scope_application_id: "docs-app",
                                scope_resource_type: "document",
                                scope_resource_id: "doc_123",
                            },
                        ],
                    },
                },
            ],
            error_codes: [],
            notes: [
                "Decision responses carry decision_id for traceability.",
                "Deny precedence remains visible through reason_code and optional deny_source.",
            ],
        },
        {
            operation_id: "authorizeExplain",
            method: "POST",
            path: "/v1/authorize/explain",
            summary: "Return the same decision contract as authorize.check plus trace data for operator diagnostics.",
            request_examples: [
                {
                    name: "authorize-explain request",
                    payload: {
                        tenant_id: "tenant_123",
                        principal_id: "principal_123",
                        application_id: "docs-app",
                        action: "documents.read",
                        resource_type: "document",
                        resource_id: "doc_123",
                    },
                },
            ],
            success_examples: [
                {
                    name: "authorize-explain deny",
                    payload: {
                        outcome: "deny",
                        decision_id: "decision_789",
                        reason_code: "DENY_MATCHED_POLICY",
                        matched_bindings: [],
                        deny_source: {
                            deny_policy_id: "deny_123",
                            permission_id: "permission_123",
                            scope_type: "tenant",
                            scope_application_id: null,
                            scope_resource_type: null,
                            scope_resource_id: null,
                            reason: "Tenant-wide suspension",
                        },
                        trace: {
                            allow_matches: [],
                            deny_matches: [],
                            traversal_hits: [],
                        },
                    },
                },
            ],
            error_codes: [],
            notes: [
                "This endpoint is for operator diagnostics and explainability, not a replacement for the hot authorize path.",
                "The request shape matches authorize.check exactly.",
            ],
        },
    ],
};
