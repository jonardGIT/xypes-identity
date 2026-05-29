import type { AuthorizationCheckResponse, AuthorizationReasonCode } from "@xypes-identity/shared";
import type { XypesIdentityClient } from "./client.js";
import type { XypesIdentityExpressNextFunction, XypesIdentityRequestSessionCarrier } from "./middleware.js";
export interface XypesIdentityRequestAuthorizationCarrier {
    xypesIdentityAuthorization?: AuthorizationCheckResponse;
}
export interface XypesIdentityRequestAuthorizationContextCarrier extends XypesIdentityRequestSessionCarrier, XypesIdentityRequestAuthorizationCarrier {
}
export type XypesIdentityApplicationIdResolver<TRequest> = (request: TRequest) => string | Promise<string>;
export type XypesIdentityActionResolver<TRequest> = (request: TRequest) => string | Promise<string>;
export type XypesIdentityResourceTypeResolver<TRequest> = (request: TRequest) => string | Promise<string>;
export type XypesIdentityResourceIdResolver<TRequest> = (request: TRequest) => string | null | Promise<string | null>;
interface XypesIdentityAuthorizationResolverOptions<TRequest extends XypesIdentityRequestAuthorizationContextCarrier> {
    client: Pick<XypesIdentityClient, "authorize">;
    resolveApplicationId: XypesIdentityApplicationIdResolver<TRequest>;
    resolveAction: XypesIdentityActionResolver<TRequest>;
    resolveResourceType: XypesIdentityResourceTypeResolver<TRequest>;
    resolveResourceId?: XypesIdentityResourceIdResolver<TRequest>;
}
export interface XypesIdentityFastifyAuthorizationHookOptions<TRequest extends XypesIdentityRequestAuthorizationContextCarrier> extends XypesIdentityAuthorizationResolverOptions<TRequest> {
}
export type XypesIdentityFastifyAuthorizationHook<TRequest extends XypesIdentityRequestAuthorizationContextCarrier, TReply = unknown> = (request: TRequest, reply: TReply) => Promise<void>;
export interface XypesIdentityExpressAuthorizationMiddlewareOptions<TRequest extends XypesIdentityRequestAuthorizationContextCarrier> extends XypesIdentityAuthorizationResolverOptions<TRequest> {
}
export type XypesIdentityExpressAuthorizationMiddleware<TRequest extends XypesIdentityRequestAuthorizationContextCarrier, TResponse = unknown> = (request: TRequest, response: TResponse, next: XypesIdentityExpressNextFunction) => void;
export interface XypesIdentityAuthorizationDeniedDecision extends AuthorizationCheckResponse {
    outcome: "deny";
}
export declare class XypesIdentityAuthorizationDeniedError extends Error {
    readonly name = "XypesIdentityAuthorizationDeniedError";
    readonly outcome = "deny";
    readonly decisionId: string;
    readonly reasonCode: AuthorizationReasonCode;
    readonly authorization: XypesIdentityAuthorizationDeniedDecision;
    constructor(authorization: XypesIdentityAuthorizationDeniedDecision);
}
export declare const isXypesIdentityAuthorizationDeniedError: (value: unknown) => value is XypesIdentityAuthorizationDeniedError;
export declare const authorizeRequest: <TRequest extends XypesIdentityRequestAuthorizationContextCarrier>(request: TRequest, options: XypesIdentityAuthorizationResolverOptions<TRequest>) => Promise<AuthorizationCheckResponse>;
export declare const createFastifyAuthorizationHook: <TRequest extends XypesIdentityRequestAuthorizationContextCarrier, TReply = unknown>(options: XypesIdentityFastifyAuthorizationHookOptions<TRequest>) => XypesIdentityFastifyAuthorizationHook<TRequest, TReply>;
export declare const createExpressAuthorizationMiddleware: <TRequest extends XypesIdentityRequestAuthorizationContextCarrier, TResponse = unknown>(options: XypesIdentityExpressAuthorizationMiddlewareOptions<TRequest>) => XypesIdentityExpressAuthorizationMiddleware<TRequest, TResponse>;
export {};
