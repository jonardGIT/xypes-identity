import type { CreateRoleBindingRequest, RoleBindingState } from "@xypes-identity/shared";
import type { UpdateRoleBindingStatusRequest } from "@xypes-identity/shared";

import type { Clock, DecisionIdGenerator } from "./session-types.js";

export type PendingRoleBindingState = Omit<RoleBindingState, "role_binding_status">;

export interface CreateRoleBindingPersistenceInput {
  role_binding: PendingRoleBindingState;
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

export interface RoleBindingRepository {
  createRoleBinding(input: CreateRoleBindingPersistenceInput): Promise<RoleBindingState>;
  updateRoleBindingStatus(
    input: UpdateRoleBindingStatusPersistenceInput,
  ): Promise<RoleBindingState>;
}

export interface CreateRoleBindingDependencies {
  roleBindingRepository: RoleBindingRepository;
  idGenerator: DecisionIdGenerator;
  clock: Clock;
}

export interface CreateRoleBindingServiceInput extends CreateRoleBindingRequest {}

export interface UpdateRoleBindingStatusPersistenceInput {
  tenant_id: string;
  role_binding_id: string;
  role_binding_status: UpdateRoleBindingStatusRequest["role_binding_status"];
  audit_event_id: string;
  outbox_event_id: string;
  actor_principal_id: string | null;
  actor_subject: string;
  reason: string;
  correlation_id: string;
  occurred_at: string;
}

export interface UpdateRoleBindingStatusDependencies {
  roleBindingRepository: RoleBindingRepository;
  idGenerator: DecisionIdGenerator;
  clock: Clock;
}

export interface UpdateRoleBindingStatusServiceInput extends UpdateRoleBindingStatusRequest {}