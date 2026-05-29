import { XypesIdentityApiError, isXypesIdentityApiErrorPayload, } from "./errors.js";
const normalizeBaseUrl = (baseUrl) => baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
const normalizeDecisionResponse = (response) => {
    const { deny_source, ...rest } = response;
    return deny_source === null ? rest : { ...rest, deny_source };
};
const normalizeExplainResponse = (response) => {
    const { deny_source, ...rest } = response;
    return deny_source === null ? rest : { ...rest, deny_source };
};
export class XypesIdentityClient {
    baseUrl;
    fetchImplementation;
    defaultHeaders;
    accessReviews = {
        listFindings: (request, options) => this.request("POST", "/v1/access-reviews/findings", request, options),
    };
    audit = {
        listEvents: (request, options) => this.request("POST", "/v1/audit-events/query", request, options),
    };
    auth = {
        resolveSession: (request, options) => this.request("POST", "/v1/auth/resolve-session", request, options),
    };
    authorize = {
        check: async (request, options) => {
            const response = await this.request("POST", "/v1/authorize/check", request, options);
            return normalizeDecisionResponse(response);
        },
        explain: async (request, options) => {
            const response = await this.request("POST", "/v1/authorize/explain", request, options);
            return normalizeExplainResponse(response);
        },
    };
    controlPlane = {
        createApplication: (request, options) => this.request("POST", "/v1/applications", request, options),
        createGroup: (request, options) => this.request("POST", "/v1/groups", request, options),
        createGroupMembership: (request, options) => this.request("POST", "/v1/group-memberships", request, options),
        createPermission: (request, options) => this.request("POST", "/v1/permissions", request, options),
        createRoleDefinition: (request, options) => this.request("POST", "/v1/role-definitions", request, options),
        updateRoleDefinitionStatus: (request, options) => {
            const { role_definition_id, ...body } = request;
            return this.request("PATCH", `/v1/role-definitions/${encodeURIComponent(role_definition_id)}/status`, body, options);
        },
        createRoleBinding: (request, options) => this.request("POST", "/v1/role-bindings", request, options),
        updateRoleBindingStatus: (request, options) => {
            const { role_binding_id, ...body } = request;
            return this.request("PATCH", `/v1/role-bindings/${encodeURIComponent(role_binding_id)}/status`, body, options);
        },
        attachRolePermission: (request, options) => this.request("POST", "/v1/role-permissions", request, options),
        createDenyPolicy: (request, options) => this.request("POST", "/v1/deny-policies", request, options),
    };
    operations = {
        getTelemetry: (options) => this.requestWithoutBody("GET", "/v1/operations/telemetry", options),
    };
    constructor(options) {
        const fetchImplementation = options.fetch ?? globalThis.fetch;
        if (typeof fetchImplementation !== "function") {
            throw new Error("Fetch API is not available. Pass a fetch implementation explicitly.");
        }
        this.baseUrl = normalizeBaseUrl(options.baseUrl);
        this.fetchImplementation = fetchImplementation;
        this.defaultHeaders = options.headers ?? {};
    }
    async request(method, path, body, options) {
        const response = await this.fetchImplementation(this.toUrl(path), {
            method,
            body: JSON.stringify(body),
            headers: {
                "content-type": "application/json",
                ...this.defaultHeaders,
                ...options?.headers,
            },
            signal: options?.signal,
        });
        const payload = await this.readJson(response);
        if (!response.ok) {
            if (isXypesIdentityApiErrorPayload(payload)) {
                throw new XypesIdentityApiError(payload);
            }
            throw new XypesIdentityApiError({
                error: response.statusText || "HTTP Error",
                message: `Request failed with status ${response.status}`,
                statusCode: response.status,
                code: "HTTP_ERROR",
            });
        }
        return payload;
    }
    async requestWithoutBody(method, path, options) {
        const response = await this.fetchImplementation(this.toUrl(path), {
            method,
            headers: {
                ...this.defaultHeaders,
                ...options?.headers,
            },
            signal: options?.signal,
        });
        const payload = await this.readJson(response);
        if (!response.ok) {
            if (isXypesIdentityApiErrorPayload(payload)) {
                throw new XypesIdentityApiError(payload);
            }
            throw new XypesIdentityApiError({
                error: response.statusText || "HTTP Error",
                message: `Request failed with status ${response.status}`,
                statusCode: response.status,
                code: "HTTP_ERROR",
            });
        }
        return payload;
    }
    toUrl(path) {
        return new URL(path.replace(/^\//, ""), this.baseUrl).toString();
    }
    async readJson(response) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
            return (await response.json());
        }
        const text = await response.text();
        if (text.length === 0) {
            return null;
        }
        try {
            return JSON.parse(text);
        }
        catch {
            return text;
        }
    }
}
export const createXypesIdentityClient = (options) => new XypesIdentityClient(options);
