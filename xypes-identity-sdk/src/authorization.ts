import type {
  AuthorizationCheckResponse,
  AuthorizationReasonCode,
} from "@xypes-identity/shared";

import type { XypesIdentityClient } from "./client.js";
import type {
  XypesIdentityExpressNextFunction,
  XypesIdentityRequestSessionCarrier,
} from "./middleware.js";

export interface XypesIdentityRequestAuthorizationCarrier {
  xypesIdentityAuthorization?: AuthorizationCheckResponse;
}

export interface XypesIdentityRequestAuthorizationContextCarrier
  extends XypesIdentityRequestSessionCarrier, XypesIdentityRequestAuthorizationCarrier {}

export type XypesIdentityApplicationIdResolver<TRequest> = (
  request: TRequest,
) => string | Promise<string>;

export type XypesIdentityActionResolver<TRequest> = (
  request: TRequest,
) => string | Promise<string>;

export type XypesIdentityResourceTypeResolver<TRequest> = (
  request: TRequest,
) => string | Promise<string>;

export type XypesIdentityResourceIdResolver<TRequest> = (
  request: TRequest,
) => string | null | Promise<string | null>;

interface XypesIdentityAuthorizationResolverOptions<
  TRequest extends XypesIdentityRequestAuthorizationContextCarrier,
> {
  client: Pick<XypesIdentityClient, "authorize">;
  resolveApplicationId: XypesIdentityApplicationIdResolver<TRequest>;
  resolveAction: XypesIdentityActionResolver<TRequest>;
  resolveResourceType: XypesIdentityResourceTypeResolver<TRequest>;
  resolveResourceId?: XypesIdentityResourceIdResolver<TRequest>;
}

export interface XypesIdentityFastifyAuthorizationHookOptions<
  TRequest extends XypesIdentityRequestAuthorizationContextCarrier,
> extends XypesIdentityAuthorizationResolverOptions<TRequest> {}

export type XypesIdentityFastifyAuthorizationHook<
  TRequest extends XypesIdentityRequestAuthorizationContextCarrier,
  TReply = unknown,
> = (request: TRequest, reply: TReply) => Promise<void>;

export interface XypesIdentityExpressAuthorizationMiddlewareOptions<
  TRequest extends XypesIdentityRequestAuthorizationContextCarrier,
> extends XypesIdentityAuthorizationResolverOptions<TRequest> {}

export type XypesIdentityExpressAuthorizationMiddleware<
  TRequest extends XypesIdentityRequestAuthorizationContextCarrier,
  TResponse = unknown,
> = (request: TRequest, response: TResponse, next: XypesIdentityExpressNextFunction) => void;

export interface XypesIdentityAuthorizationDeniedDecision
  extends AuthorizationCheckResponse {
  outcome: "deny";
}

export class XypesIdentityAuthorizationDeniedError extends Error {
  readonly name = "XypesIdentityAuthorizationDeniedError";
  readonly outcome = "deny";
  readonly decisionId: string;
  readonly reasonCode: AuthorizationReasonCode;
  readonly authorization: XypesIdentityAuthorizationDeniedDecision;

  constructor(authorization: XypesIdentityAuthorizationDeniedDecision) {
    super(`Authorization denied with reason code ${authorization.reason_code}.`);
    this.decisionId = authorization.decision_id;
    this.reasonCode = authorization.reason_code;
    this.authorization = authorization;
  }
}

export const isXypesIdentityAuthorizationDeniedError = (
  value: unknown,
): value is XypesIdentityAuthorizationDeniedError =>
  value instanceof XypesIdentityAuthorizationDeniedError;

const requireNonEmptyString = (value: string, fieldName: string): string => {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must resolve to a non-empty string.`);
  }

  return value;
};

const requireResolvedSession = <
  TRequest extends XypesIdentityRequestSessionCarrier,
>(request: TRequest) => {
  if (request.xypesIdentity === undefined) {
    throw new Error(
      "xypesIdentity session is required before authorization. Register session resolution middleware first.",
    );
  }

  return request.xypesIdentity;
};

export const authorizeRequest = async <
  TRequest extends XypesIdentityRequestAuthorizationContextCarrier,
>(
  request: TRequest,
  options: XypesIdentityAuthorizationResolverOptions<TRequest>,
): Promise<AuthorizationCheckResponse> => {
  const session = requireResolvedSession(request);
  const authorization = await options.client.authorize.check({
    tenant_id: session.principal.tenant_id,
    principal_id: session.principal.principal_id,
    application_id: requireNonEmptyString(
      await options.resolveApplicationId(request),
      "application_id",
    ),
    action: requireNonEmptyString(await options.resolveAction(request), "action"),
    resource_type: requireNonEmptyString(
      await options.resolveResourceType(request),
      "resource_type",
    ),
    resource_id: options.resolveResourceId !== undefined
      ? await options.resolveResourceId(request)
      : null,
  });

  request.xypesIdentityAuthorization = authorization;

  if (authorization.outcome === "deny") {
    throw new XypesIdentityAuthorizationDeniedError(
      authorization as XypesIdentityAuthorizationDeniedDecision,
    );
  }

  return authorization;
};

export const createFastifyAuthorizationHook = <
  TRequest extends XypesIdentityRequestAuthorizationContextCarrier,
  TReply = unknown,
>(
  options: XypesIdentityFastifyAuthorizationHookOptions<TRequest>,
): XypesIdentityFastifyAuthorizationHook<TRequest, TReply> => {
  return async (request: TRequest, _reply: TReply): Promise<void> => {
    await authorizeRequest(request, options);
  };
};

export const createExpressAuthorizationMiddleware = <
  TRequest extends XypesIdentityRequestAuthorizationContextCarrier,
  TResponse = unknown,
>(
  options: XypesIdentityExpressAuthorizationMiddlewareOptions<TRequest>,
): XypesIdentityExpressAuthorizationMiddleware<TRequest, TResponse> => {
  return (request: TRequest, _response: TResponse, next: XypesIdentityExpressNextFunction): void => {
    void authorizeRequest(request, options).then(
      () => next(),
      (error: unknown) => next(error),
    );
  };
};