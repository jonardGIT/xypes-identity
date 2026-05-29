import type {
  OperationalTelemetrySnapshot,
  ListAuditEventsRequest,
  ListAuditEventsResponse,
  ListAccessReviewFindingsRequest,
  ListAccessReviewFindingsResponse,
  AttachRolePermissionRequest,
  AttachRolePermissionResponse,
  AuthorizationCheckRequest,
  AuthorizationCheckResponse,
  AuthorizationExplainRequest,
  AuthorizationExplainResponse,
  CreateApplicationRequest,
  CreateApplicationResponse,
  CreateDenyPolicyRequest,
  CreateDenyPolicyResponse,
  CreateGroupMembershipRequest,
  CreateGroupMembershipResponse,
  CreateGroupRequest,
  CreateGroupResponse,
  CreatePermissionRequest,
  CreatePermissionResponse,
  CreateRoleBindingRequest,
  CreateRoleBindingResponse,
  CreateRoleDefinitionRequest,
  CreateRoleDefinitionResponse,
  ResolveSessionRequest,
  ResolveSessionResponse,
  UpdateRoleBindingStatusRequest,
  UpdateRoleBindingStatusResponse,
  UpdateRoleDefinitionStatusRequest,
  UpdateRoleDefinitionStatusResponse,
} from "@xypes-identity/shared";

import {
  XypesIdentityApiError,
  isXypesIdentityApiErrorPayload,
} from "./errors.js";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type AuthorizationCheckResponseWire = Omit<AuthorizationCheckResponse, "deny_source"> & {
  deny_source: Exclude<AuthorizationCheckResponse["deny_source"], undefined> | null;
};

type AuthorizationExplainResponseWire = Omit<AuthorizationExplainResponse, "deny_source"> & {
  deny_source: Exclude<AuthorizationExplainResponse["deny_source"], undefined> | null;
};

export interface XypesIdentityRequestOptions {
  headers?: HeadersInit;
  signal?: AbortSignal;
}

export interface XypesIdentityClientOptions {
  baseUrl: string;
  fetch?: FetchLike;
  headers?: HeadersInit;
}

const normalizeBaseUrl = (baseUrl: string): string =>
  baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

const normalizeDecisionResponse = (
  response: AuthorizationCheckResponseWire,
): AuthorizationCheckResponse => {
  const { deny_source, ...rest } = response;

  return deny_source === null ? rest : { ...rest, deny_source };
};

const normalizeExplainResponse = (
  response: AuthorizationExplainResponseWire,
): AuthorizationExplainResponse => {
  const { deny_source, ...rest } = response;

  return deny_source === null ? rest : { ...rest, deny_source };
};

export class XypesIdentityClient {
  private readonly baseUrl: string;
  private readonly fetchImplementation: FetchLike;
  private readonly defaultHeaders: HeadersInit;

  readonly accessReviews = {
    listFindings: (
      request: ListAccessReviewFindingsRequest,
      options?: XypesIdentityRequestOptions,
    ): Promise<ListAccessReviewFindingsResponse> =>
      this.request<ListAccessReviewFindingsResponse>(
        "POST",
        "/v1/access-reviews/findings",
        request,
        options,
      ),
  };

  readonly audit = {
    listEvents: (
      request: ListAuditEventsRequest,
      options?: XypesIdentityRequestOptions,
    ): Promise<ListAuditEventsResponse> =>
      this.request<ListAuditEventsResponse>(
        "POST",
        "/v1/audit-events/query",
        request,
        options,
      ),
  };

  readonly auth = {
    resolveSession: (
      request: ResolveSessionRequest,
      options?: XypesIdentityRequestOptions,
    ): Promise<ResolveSessionResponse> =>
      this.request<ResolveSessionResponse>("POST", "/v1/auth/resolve-session", request, options),
  };

  readonly authorize = {
    check: async (
      request: AuthorizationCheckRequest,
      options?: XypesIdentityRequestOptions,
    ): Promise<AuthorizationCheckResponse> => {
      const response = await this.request<AuthorizationCheckResponseWire>(
        "POST",
        "/v1/authorize/check",
        request,
        options,
      );

      return normalizeDecisionResponse(response);
    },
    explain: async (
      request: AuthorizationExplainRequest,
      options?: XypesIdentityRequestOptions,
    ): Promise<AuthorizationExplainResponse> => {
      const response = await this.request<AuthorizationExplainResponseWire>(
        "POST",
        "/v1/authorize/explain",
        request,
        options,
      );

      return normalizeExplainResponse(response);
    },
  };

  readonly controlPlane = {
    createApplication: (
      request: CreateApplicationRequest,
      options?: XypesIdentityRequestOptions,
    ): Promise<CreateApplicationResponse> =>
      this.request<CreateApplicationResponse>("POST", "/v1/applications", request, options),
    createGroup: (
      request: CreateGroupRequest,
      options?: XypesIdentityRequestOptions,
    ): Promise<CreateGroupResponse> =>
      this.request<CreateGroupResponse>("POST", "/v1/groups", request, options),
    createGroupMembership: (
      request: CreateGroupMembershipRequest,
      options?: XypesIdentityRequestOptions,
    ): Promise<CreateGroupMembershipResponse> =>
      this.request<CreateGroupMembershipResponse>("POST", "/v1/group-memberships", request, options),
    createPermission: (
      request: CreatePermissionRequest,
      options?: XypesIdentityRequestOptions,
    ): Promise<CreatePermissionResponse> =>
      this.request<CreatePermissionResponse>("POST", "/v1/permissions", request, options),
    createRoleDefinition: (
      request: CreateRoleDefinitionRequest,
      options?: XypesIdentityRequestOptions,
    ): Promise<CreateRoleDefinitionResponse> =>
      this.request<CreateRoleDefinitionResponse>("POST", "/v1/role-definitions", request, options),
    updateRoleDefinitionStatus: (
      request: UpdateRoleDefinitionStatusRequest,
      options?: XypesIdentityRequestOptions,
    ): Promise<UpdateRoleDefinitionStatusResponse> => {
      const { role_definition_id, ...body } = request;

      return this.request<UpdateRoleDefinitionStatusResponse>(
        "PATCH",
        `/v1/role-definitions/${encodeURIComponent(role_definition_id)}/status`,
        body,
        options,
      );
    },
    createRoleBinding: (
      request: CreateRoleBindingRequest,
      options?: XypesIdentityRequestOptions,
    ): Promise<CreateRoleBindingResponse> =>
      this.request<CreateRoleBindingResponse>("POST", "/v1/role-bindings", request, options),
    updateRoleBindingStatus: (
      request: UpdateRoleBindingStatusRequest,
      options?: XypesIdentityRequestOptions,
    ): Promise<UpdateRoleBindingStatusResponse> => {
      const { role_binding_id, ...body } = request;

      return this.request<UpdateRoleBindingStatusResponse>(
        "PATCH",
        `/v1/role-bindings/${encodeURIComponent(role_binding_id)}/status`,
        body,
        options,
      );
    },
    attachRolePermission: (
      request: AttachRolePermissionRequest,
      options?: XypesIdentityRequestOptions,
    ): Promise<AttachRolePermissionResponse> =>
      this.request<AttachRolePermissionResponse>("POST", "/v1/role-permissions", request, options),
    createDenyPolicy: (
      request: CreateDenyPolicyRequest,
      options?: XypesIdentityRequestOptions,
    ): Promise<CreateDenyPolicyResponse> =>
      this.request<CreateDenyPolicyResponse>("POST", "/v1/deny-policies", request, options),
  };

  readonly operations = {
    getTelemetry: (
      options?: XypesIdentityRequestOptions,
    ): Promise<OperationalTelemetrySnapshot> =>
      this.requestWithoutBody<OperationalTelemetrySnapshot>(
        "GET",
        "/v1/operations/telemetry",
        options,
      ),
  };

  constructor(options: XypesIdentityClientOptions) {
    const fetchImplementation = options.fetch ?? globalThis.fetch;

    if (typeof fetchImplementation !== "function") {
      throw new Error("Fetch API is not available. Pass a fetch implementation explicitly.");
    }

    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.fetchImplementation = fetchImplementation;
    this.defaultHeaders = options.headers ?? {};
  }

  private async request<TResponse>(
    method: string,
    path: string,
    body: unknown,
    options?: XypesIdentityRequestOptions,
  ): Promise<TResponse> {
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

    return payload as TResponse;
  }

  private async requestWithoutBody<TResponse>(
    method: string,
    path: string,
    options?: XypesIdentityRequestOptions,
  ): Promise<TResponse> {
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

    return payload as TResponse;
  }

  private toUrl(path: string): string {
    return new URL(path.replace(/^\//, ""), this.baseUrl).toString();
  }

  private async readJson(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      return (await response.json()) as unknown;
    }

    const text = await response.text();

    if (text.length === 0) {
      return null;
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
}

export const createXypesIdentityClient = (
  options: XypesIdentityClientOptions,
): XypesIdentityClient => new XypesIdentityClient(options);