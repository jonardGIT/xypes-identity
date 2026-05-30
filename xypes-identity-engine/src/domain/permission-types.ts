import type {
  CreatePermissionRequest,
  ListPermissionsRequest,
  PermissionState,
} from "@xypes-identity/shared";

import type { Clock, DecisionIdGenerator } from "./session-types.js";

export interface CreatePermissionPersistenceInput {
  permission: PermissionState;
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

export interface PermissionRepository {
  createPermission(input: CreatePermissionPersistenceInput): Promise<void>;
  listPermissions(input: ListPermissionsRepositoryInput): Promise<PermissionState[]>;
}

export interface CreatePermissionDependencies {
  permissionRepository: PermissionRepository;
  idGenerator: DecisionIdGenerator;
  clock: Clock;
}

export interface CreatePermissionServiceInput extends CreatePermissionRequest {}

export interface ListPermissionsDependencies {
  permissionRepository: PermissionRepository;
  clock: Clock;
}

export interface ListPermissionsRepositoryInput extends ListPermissionsRequest {}

export interface ListPermissionsServiceInput extends ListPermissionsRequest {}