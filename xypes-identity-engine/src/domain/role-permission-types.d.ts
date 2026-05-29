import type { AttachRolePermissionRequest, RolePermissionState } from "@xypes-identity/shared";
import type { Clock, DecisionIdGenerator } from "./session-types.js";
export interface AttachRolePermissionPersistenceInput {
    role_permission: RolePermissionState;
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
export interface RolePermissionRepository {
    attachRolePermission(input: AttachRolePermissionPersistenceInput): Promise<void>;
}
export interface AttachRolePermissionDependencies {
    rolePermissionRepository: RolePermissionRepository;
    idGenerator: DecisionIdGenerator;
    clock: Clock;
}
export interface AttachRolePermissionServiceInput extends AttachRolePermissionRequest {
}
