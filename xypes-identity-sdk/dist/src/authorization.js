export class XypesIdentityAuthorizationDeniedError extends Error {
    name = "XypesIdentityAuthorizationDeniedError";
    outcome = "deny";
    decisionId;
    reasonCode;
    authorization;
    constructor(authorization) {
        super(`Authorization denied with reason code ${authorization.reason_code}.`);
        this.decisionId = authorization.decision_id;
        this.reasonCode = authorization.reason_code;
        this.authorization = authorization;
    }
}
export const isXypesIdentityAuthorizationDeniedError = (value) => value instanceof XypesIdentityAuthorizationDeniedError;
const requireNonEmptyString = (value, fieldName) => {
    if (value.trim().length === 0) {
        throw new Error(`${fieldName} must resolve to a non-empty string.`);
    }
    return value;
};
const requireResolvedSession = (request) => {
    if (request.xypesIdentity === undefined) {
        throw new Error("xypesIdentity session is required before authorization. Register session resolution middleware first.");
    }
    return request.xypesIdentity;
};
export const authorizeRequest = async (request, options) => {
    const session = requireResolvedSession(request);
    const authorization = await options.client.authorize.check({
        tenant_id: session.principal.tenant_id,
        principal_id: session.principal.principal_id,
        application_id: requireNonEmptyString(await options.resolveApplicationId(request), "application_id"),
        action: requireNonEmptyString(await options.resolveAction(request), "action"),
        resource_type: requireNonEmptyString(await options.resolveResourceType(request), "resource_type"),
        resource_id: options.resolveResourceId !== undefined
            ? await options.resolveResourceId(request)
            : null,
    });
    request.xypesIdentityAuthorization = authorization;
    if (authorization.outcome === "deny") {
        throw new XypesIdentityAuthorizationDeniedError(authorization);
    }
    return authorization;
};
export const createFastifyAuthorizationHook = (options) => {
    return async (request, _reply) => {
        await authorizeRequest(request, options);
    };
};
export const createExpressAuthorizationMiddleware = (options) => {
    return (request, _response, next) => {
        void authorizeRequest(request, options).then(() => next(), (error) => next(error));
    };
};
