import type { AuthorizationCacheVersionStore } from "../domain/authorization-cache-types.js";
import type { OutboxEventHandler, OutboxEventRecord } from "../domain/outbox-types.js";
import { getAuthorizationCacheInvalidation } from "./authorization-cache-invalidation.js";

export class AuthorizationCacheInvalidationHandler implements OutboxEventHandler {
  constructor(
    private readonly authorizationCacheVersionStore: AuthorizationCacheVersionStore,
  ) {}

  async handle(event: OutboxEventRecord): Promise<void> {
    const invalidation = getAuthorizationCacheInvalidation(event);

    if (invalidation === null) {
      return;
    }

    await this.authorizationCacheVersionStore.bumpTenantVersions(invalidation);
  }
}
