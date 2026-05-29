import type { CreateGroupMembershipRequest, GroupMembershipState } from "@xypes-identity/shared";

import type { Clock, DecisionIdGenerator } from "./session-types.js";

export interface CreateGroupMembershipPersistenceInput {
  group_membership: GroupMembershipState;
  audit_event_id: string;
  outbox_event_id: string;
  actor_principal_id: string | null;
  actor_subject: string;
  reason: string;
  correlation_id: string;
  reference_type: string;
  reference_id: string;
  occurred_at: string;
}

export interface GroupMembershipRepository {
  createGroupMembership(input: CreateGroupMembershipPersistenceInput): Promise<void>;
}

export interface CreateGroupMembershipDependencies {
  groupMembershipRepository: GroupMembershipRepository;
  idGenerator: DecisionIdGenerator;
  clock: Clock;
}

export interface CreateGroupMembershipServiceInput extends CreateGroupMembershipRequest {}