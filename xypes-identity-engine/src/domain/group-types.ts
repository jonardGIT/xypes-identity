import type { CreateGroupRequest, GroupState } from "@xypes-identity/shared";

import type { Clock, DecisionIdGenerator } from "./session-types.js";

export interface CreateGroupPersistenceInput {
  group: GroupState;
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

export interface GroupRepository {
  createGroup(input: CreateGroupPersistenceInput): Promise<void>;
}

export interface CreateGroupDependencies {
  groupRepository: GroupRepository;
  idGenerator: DecisionIdGenerator;
  clock: Clock;
}

export interface CreateGroupServiceInput extends CreateGroupRequest {}