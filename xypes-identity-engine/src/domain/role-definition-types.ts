import type {
  CreateRoleDefinitionRequest,
  RoleDefinitionState,
  UpdateRoleDefinitionStatusRequest,
} from "@xypes-identity/shared";

import type { Clock, DecisionIdGenerator } from "./session-types.js";

export interface CreateRoleDefinitionPersistenceInput {
  role_definition: RoleDefinitionState;
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

export interface RoleDefinitionRepository {
  createRoleDefinition(input: CreateRoleDefinitionPersistenceInput): Promise<void>;
  updateRoleDefinitionStatus(
    input: UpdateRoleDefinitionStatusPersistenceInput,
  ): Promise<RoleDefinitionState>;
}

export interface CreateRoleDefinitionDependencies {
  roleDefinitionRepository: RoleDefinitionRepository;
  idGenerator: DecisionIdGenerator;
  clock: Clock;
}

export interface CreateRoleDefinitionServiceInput extends CreateRoleDefinitionRequest {}

export interface UpdateRoleDefinitionStatusPersistenceInput {
  tenant_id: string;
  role_definition_id: string;
  status: UpdateRoleDefinitionStatusRequest["status"];
  audit_event_id: string;
  outbox_event_id: string;
  actor_principal_id: string | null;
  actor_subject: string;
  reason: string;
  correlation_id: string;
  occurred_at: string;
}

export interface UpdateRoleDefinitionStatusDependencies {
  roleDefinitionRepository: RoleDefinitionRepository;
  idGenerator: DecisionIdGenerator;
  clock: Clock;
}

export interface UpdateRoleDefinitionStatusServiceInput extends UpdateRoleDefinitionStatusRequest {}