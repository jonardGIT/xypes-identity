import type { ResolveSessionResponse } from "@xypes-identity/shared";
import type { XypesIdentityClient } from "./client.js";
export interface XypesIdentityRequestSessionCarrier {
    xypesIdentity?: ResolveSessionResponse;
}
export type XypesIdentityTenantIdResolver<TRequest> = (request: TRequest) => string | Promise<string>;
export type XypesIdentityTokenResolver<TRequest> = (request: TRequest) => string | Promise<string>;
interface XypesIdentitySessionResolverOptions<TRequest> {
    client: Pick<XypesIdentityClient, "auth">;
    resolveTenantId: XypesIdentityTenantIdResolver<TRequest>;
    resolveToken: XypesIdentityTokenResolver<TRequest>;
}
export interface XypesIdentityFastifySessionHookOptions<TRequest extends XypesIdentityRequestSessionCarrier> extends XypesIdentitySessionResolverOptions<TRequest> {
}
export type XypesIdentityFastifySessionHook<TRequest extends XypesIdentityRequestSessionCarrier, TReply = unknown> = (request: TRequest, reply: TReply) => Promise<void>;
export interface XypesIdentityExpressSessionMiddlewareOptions<TRequest extends XypesIdentityRequestSessionCarrier> extends XypesIdentitySessionResolverOptions<TRequest> {
}
export type XypesIdentityExpressNextFunction = (error?: unknown) => void;
export type XypesIdentityExpressSessionMiddleware<TRequest extends XypesIdentityRequestSessionCarrier, TResponse = unknown> = (request: TRequest, response: TResponse, next: XypesIdentityExpressNextFunction) => void;
export declare const createFastifySessionHook: <TRequest extends XypesIdentityRequestSessionCarrier, TReply = unknown>(options: XypesIdentityFastifySessionHookOptions<TRequest>) => XypesIdentityFastifySessionHook<TRequest, TReply>;
export declare const createExpressSessionMiddleware: <TRequest extends XypesIdentityRequestSessionCarrier, TResponse = unknown>(options: XypesIdentityExpressSessionMiddlewareOptions<TRequest>) => XypesIdentityExpressSessionMiddleware<TRequest, TResponse>;
export {};
