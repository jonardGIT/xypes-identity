import type { CreateDenyPolicyRequest, DenyPolicyState } from "@xypes-identity/shared";

import type { Clock, DecisionIdGenerator } from "./session-types.js";

export interface CreateDenyPolicyPersistenceInput {
  deny_policy: DenyPolicyState;
  audit_event_id: string;
  outbox_event_id: string;
  actor_principal_id: string | null;
  actor_subject: string;
  audit_reason: string;
  correlation_id: string;
  reference_type: string;
  reference_id: string;
  occurred_at: string;
}

export interface DenyPolicyRepository {
  createDenyPolicy(input: CreateDenyPolicyPersistenceInput): Promise<void>;
}

export interface CreateDenyPolicyDependencies {
  denyPolicyRepository: DenyPolicyRepository;
  idGenerator: DecisionIdGenerator;
  clock: Clock;
}

export interface CreateDenyPolicyServiceInput extends CreateDenyPolicyRequest {}