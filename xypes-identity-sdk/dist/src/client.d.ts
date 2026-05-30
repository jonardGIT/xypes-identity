import type { OperationalTelemetrySnapshot, ListAuditEventsRequest, ListAuditEventsResponse, ListAccessReviewFindingsRequest, ListAccessReviewFindingsResponse, ListApplicationsRequest, ListApplicationsResponse, ListPermissionsRequest, ListPermissionsResponse, ListRoleDefinitionsRequest, ListRoleDefinitionsResponse, AttachRolePermissionRequest, AttachRolePermissionResponse, AuthorizationCheckRequest, AuthorizationCheckResponse, AuthorizationExplainRequest, AuthorizationExplainResponse, CreateApplicationRequest, CreateApplicationResponse, CreateDenyPolicyRequest, CreateDenyPolicyResponse, CreateGroupMembershipRequest, CreateGroupMembershipResponse, CreateGroupRequest, CreateGroupResponse, CreatePermissionRequest, CreatePermissionResponse, CreateRoleBindingRequest, CreateRoleBindingResponse, CreateRoleDefinitionRequest, CreateRoleDefinitionResponse, ResolveSessionRequest, ResolveSessionResponse, UpdateRoleBindingStatusRequest, UpdateRoleBindingStatusResponse, UpdateRoleDefinitionStatusRequest, UpdateRoleDefinitionStatusResponse } from "@xypes-identity/shared";
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
export interface XypesIdentityRequestOptions {
    headers?: HeadersInit;
    signal?: AbortSignal;
}
export interface XypesIdentityClientOptions {
    baseUrl: string;
    fetch?: FetchLike;
    headers?: HeadersInit;
}
export declare class XypesIdentityClient {
    private readonly baseUrl;
    private readonly fetchImplementation;
    private readonly defaultHeaders;
    readonly accessReviews: {
        listFindings: (request: ListAccessReviewFindingsRequest, options?: XypesIdentityRequestOptions) => Promise<ListAccessReviewFindingsResponse>;
    };
    readonly audit: {
        listEvents: (request: ListAuditEventsRequest, options?: XypesIdentityRequestOptions) => Promise<ListAuditEventsResponse>;
    };
    readonly auth: {
        resolveSession: (request: ResolveSessionRequest, options?: XypesIdentityRequestOptions) => Promise<ResolveSessionResponse>;
    };
    readonly authorize: {
        check: (request: AuthorizationCheckRequest, options?: XypesIdentityRequestOptions) => Promise<AuthorizationCheckResponse>;
        explain: (request: AuthorizationExplainRequest, options?: XypesIdentityRequestOptions) => Promise<AuthorizationExplainResponse>;
    };
    readonly controlPlane: {
        createApplication: (request: CreateApplicationRequest, options?: XypesIdentityRequestOptions) => Promise<CreateApplicationResponse>;
        listApplications: (request: ListApplicationsRequest, options?: XypesIdentityRequestOptions) => Promise<ListApplicationsResponse>;
        createGroup: (request: CreateGroupRequest, options?: XypesIdentityRequestOptions) => Promise<CreateGroupResponse>;
        createGroupMembership: (request: CreateGroupMembershipRequest, options?: XypesIdentityRequestOptions) => Promise<CreateGroupMembershipResponse>;
        createPermission: (request: CreatePermissionRequest, options?: XypesIdentityRequestOptions) => Promise<CreatePermissionResponse>;
        listPermissions: (request: ListPermissionsRequest, options?: XypesIdentityRequestOptions) => Promise<ListPermissionsResponse>;
        createRoleDefinition: (request: CreateRoleDefinitionRequest, options?: XypesIdentityRequestOptions) => Promise<CreateRoleDefinitionResponse>;
        listRoleDefinitions: (request: ListRoleDefinitionsRequest, options?: XypesIdentityRequestOptions) => Promise<ListRoleDefinitionsResponse>;
        updateRoleDefinitionStatus: (request: UpdateRoleDefinitionStatusRequest, options?: XypesIdentityRequestOptions) => Promise<UpdateRoleDefinitionStatusResponse>;
        createRoleBinding: (request: CreateRoleBindingRequest, options?: XypesIdentityRequestOptions) => Promise<CreateRoleBindingResponse>;
        updateRoleBindingStatus: (request: UpdateRoleBindingStatusRequest, options?: XypesIdentityRequestOptions) => Promise<UpdateRoleBindingStatusResponse>;
        attachRolePermission: (request: AttachRolePermissionRequest, options?: XypesIdentityRequestOptions) => Promise<AttachRolePermissionResponse>;
        createDenyPolicy: (request: CreateDenyPolicyRequest, options?: XypesIdentityRequestOptions) => Promise<CreateDenyPolicyResponse>;
    };
    readonly operations: {
        getTelemetry: (options?: XypesIdentityRequestOptions) => Promise<OperationalTelemetrySnapshot>;
    };
    constructor(options: XypesIdentityClientOptions);
    private request;
    private requestWithoutBody;
    private toUrl;
    private readJson;
}
export declare const createXypesIdentityClient: (options: XypesIdentityClientOptions) => XypesIdentityClient;
export {};
