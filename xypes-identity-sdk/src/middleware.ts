import type { ResolveSessionResponse } from "@xypes-identity/shared";

import type { XypesIdentityClient } from "./client.js";

export interface XypesIdentityRequestSessionCarrier {
  xypesIdentity?: ResolveSessionResponse;
}

export type XypesIdentityTenantIdResolver<TRequest> = (
  request: TRequest,
) => string | Promise<string>;

export type XypesIdentityTokenResolver<TRequest> = (
  request: TRequest,
) => string | Promise<string>;

interface XypesIdentitySessionResolverOptions<TRequest> {
  client: Pick<XypesIdentityClient, "auth">;
  resolveTenantId: XypesIdentityTenantIdResolver<TRequest>;
  resolveToken: XypesIdentityTokenResolver<TRequest>;
}

export interface XypesIdentityFastifySessionHookOptions<
  TRequest extends XypesIdentityRequestSessionCarrier,
> extends XypesIdentitySessionResolverOptions<TRequest> {}

export type XypesIdentityFastifySessionHook<
  TRequest extends XypesIdentityRequestSessionCarrier,
  TReply = unknown,
> = (request: TRequest, reply: TReply) => Promise<void>;

export interface XypesIdentityExpressSessionMiddlewareOptions<
  TRequest extends XypesIdentityRequestSessionCarrier,
> extends XypesIdentitySessionResolverOptions<TRequest> {}

export type XypesIdentityExpressNextFunction = (error?: unknown) => void;

export type XypesIdentityExpressSessionMiddleware<
  TRequest extends XypesIdentityRequestSessionCarrier,
  TResponse = unknown,
> = (request: TRequest, response: TResponse, next: XypesIdentityExpressNextFunction) => void;

const requireNonEmptyString = (value: string, fieldName: string): string => {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must resolve to a non-empty string.`);
  }

  return value;
};

const resolveRequestSession = async <TRequest extends XypesIdentityRequestSessionCarrier>(
  request: TRequest,
  options: XypesIdentitySessionResolverOptions<TRequest>,
): Promise<void> => {
  const tenantId = requireNonEmptyString(
    await options.resolveTenantId(request),
    "tenant_id",
  );
  const token = requireNonEmptyString(await options.resolveToken(request), "token");

  request.xypesIdentity = await options.client.auth.resolveSession({
    tenant_id: tenantId,
    token,
  });
};

export const createFastifySessionHook = <
  TRequest extends XypesIdentityRequestSessionCarrier,
  TReply = unknown,
>(
  options: XypesIdentityFastifySessionHookOptions<TRequest>,
): XypesIdentityFastifySessionHook<TRequest, TReply> => {
  return async (request: TRequest, _reply: TReply): Promise<void> => {
    await resolveRequestSession(request, options);
  };
};

export const createExpressSessionMiddleware = <
  TRequest extends XypesIdentityRequestSessionCarrier,
  TResponse = unknown,
>(
  options: XypesIdentityExpressSessionMiddlewareOptions<TRequest>,
): XypesIdentityExpressSessionMiddleware<TRequest, TResponse> => {
  return (request: TRequest, _response: TResponse, next: XypesIdentityExpressNextFunction): void => {
    void resolveRequestSession(request, options).then(
      () => next(),
      (error: unknown) => next(error),
    );
  };
};