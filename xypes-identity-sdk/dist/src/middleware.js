const requireNonEmptyString = (value, fieldName) => {
    if (value.trim().length === 0) {
        throw new Error(`${fieldName} must resolve to a non-empty string.`);
    }
    return value;
};
const resolveRequestSession = async (request, options) => {
    const tenantId = requireNonEmptyString(await options.resolveTenantId(request), "tenant_id");
    const token = requireNonEmptyString(await options.resolveToken(request), "token");
    request.xypesIdentity = await options.client.auth.resolveSession({
        tenant_id: tenantId,
        token,
    });
};
export const createFastifySessionHook = (options) => {
    return async (request, _reply) => {
        await resolveRequestSession(request, options);
    };
};
export const createExpressSessionMiddleware = (options) => {
    return (request, _response, next) => {
        void resolveRequestSession(request, options).then(() => next(), (error) => next(error));
    };
};
