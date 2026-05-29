import { getAuthorizationCacheInvalidation } from "./authorization-cache-invalidation.js";
export class AuthorizationCacheInvalidationHandler {
    authorizationCacheVersionStore;
    constructor(authorizationCacheVersionStore) {
        this.authorizationCacheVersionStore = authorizationCacheVersionStore;
    }
    async handle(event) {
        const invalidation = getAuthorizationCacheInvalidation(event);
        if (invalidation === null) {
            return;
        }
        await this.authorizationCacheVersionStore.bumpTenantVersions(invalidation);
    }
}
