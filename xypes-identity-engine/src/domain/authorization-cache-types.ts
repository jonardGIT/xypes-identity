import type {
  AuthorizationCheckRequest,
  AuthorizationExplainTraversalHit,
} from "@xypes-identity/shared";

import type {
  AuthorizationBindingRecord,
  AuthorizationDenyRecord,
} from "./authorization-types.js";

export interface TenantAuthorizationCacheVersions {
  decision_version: number;
  expansion_version: number;
}

export interface AuthorizationEvaluationSnapshot {
  matched_bindings: AuthorizationBindingRecord[];
  deny_policies: AuthorizationDenyRecord[];
}

export interface AuthorizationDecisionCacheGetInput {
  request: AuthorizationCheckRequest;
  versions: TenantAuthorizationCacheVersions;
}

export interface AuthorizationDecisionCacheSetInput extends AuthorizationDecisionCacheGetInput {
  snapshot: AuthorizationEvaluationSnapshot;
}

export interface AuthorizationDecisionCache {
  get(input: AuthorizationDecisionCacheGetInput): Promise<AuthorizationEvaluationSnapshot | null>;
  set(input: AuthorizationDecisionCacheSetInput): Promise<void>;
}

export interface AuthorizationExpansionCacheGetInput {
  tenant_id: string;
  principal_id: string;
  expansion_version: number;
}

export interface AuthorizationExpansionCacheSetInput extends AuthorizationExpansionCacheGetInput {
  traversal_hits: AuthorizationExplainTraversalHit[];
}

export interface AuthorizationExpansionCache {
  get(input: AuthorizationExpansionCacheGetInput): Promise<AuthorizationExplainTraversalHit[] | null>;
  set(input: AuthorizationExpansionCacheSetInput): Promise<void>;
}

export interface BumpTenantAuthorizationCacheVersionsInput {
  tenant_id: string;
  decision_version: boolean;
  expansion_version: boolean;
}

export interface AuthorizationCacheVersionStore {
  getTenantVersions(tenantId: string): Promise<TenantAuthorizationCacheVersions>;
  bumpTenantVersions(input: BumpTenantAuthorizationCacheVersionsInput): Promise<void>;
}

export interface AuthorizationCacheDependencies {
  authorizationDecisionCache: AuthorizationDecisionCache;
  authorizationExpansionCache: AuthorizationExpansionCache;
  authorizationCacheVersionStore: AuthorizationCacheVersionStore;
}
