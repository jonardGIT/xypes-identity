export * from "@xypes-identity/shared";

export {
  XypesIdentityClient,
  createXypesIdentityClient,
  type XypesIdentityClientOptions,
  type XypesIdentityRequestOptions,
} from "./client.js";

export {
  XypesIdentityApiError,
  isXypesIdentityApiError,
  isXypesIdentityResolveSessionAvailabilityError,
  isXypesIdentityResolveSessionAvailabilityErrorCode,
  type XypesIdentityApiErrorPayload,
  type XypesIdentityResolveSessionAvailabilityErrorCode,
} from "./errors.js";

export {
  authorizeRequest,
  createExpressAuthorizationMiddleware,
  createFastifyAuthorizationHook,
  isXypesIdentityAuthorizationDeniedError,
  XypesIdentityAuthorizationDeniedError,
  type XypesIdentityActionResolver,
  type XypesIdentityApplicationIdResolver,
  type XypesIdentityAuthorizationDeniedDecision,
  type XypesIdentityExpressAuthorizationMiddleware,
  type XypesIdentityExpressAuthorizationMiddlewareOptions,
  type XypesIdentityFastifyAuthorizationHook,
  type XypesIdentityFastifyAuthorizationHookOptions,
  type XypesIdentityRequestAuthorizationCarrier,
  type XypesIdentityRequestAuthorizationContextCarrier,
  type XypesIdentityResourceIdResolver,
  type XypesIdentityResourceTypeResolver,
} from "./authorization.js";

export {
  createExpressSessionMiddleware,
  createFastifySessionHook,
  type XypesIdentityExpressNextFunction,
  type XypesIdentityExpressSessionMiddleware,
  type XypesIdentityExpressSessionMiddlewareOptions,
  type XypesIdentityFastifySessionHook,
  type XypesIdentityFastifySessionHookOptions,
  type XypesIdentityRequestSessionCarrier,
  type XypesIdentityTenantIdResolver,
  type XypesIdentityTokenResolver,
} from "./middleware.js";