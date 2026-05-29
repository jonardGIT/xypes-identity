import type {
  CreateGroupMembershipResponse,
  GroupMembershipState,
} from "@xypes-identity/shared";

import { CreateGroupMembershipError } from "../domain/group-membership-errors.js";
import type {
  CreateGroupMembershipDependencies,
  CreateGroupMembershipServiceInput,
} from "../domain/group-membership-types.js";

const assertValidSubject = (input: CreateGroupMembershipServiceInput): void => {
  const hasPrincipalSubject = input.member_principal_id !== null;
  const hasGroupSubject = input.member_group_id !== null;

  if (hasPrincipalSubject === hasGroupSubject) {
    throw new CreateGroupMembershipError(
      "GROUP_MEMBERSHIP_SUBJECT_INVALID",
      "Exactly one subject must be supplied via member_principal_id or member_group_id.",
      400,
    );
  }

  if (input.member_group_id === input.group_id) {
    throw new CreateGroupMembershipError(
      "GROUP_MEMBERSHIP_SELF_REFERENCE",
      "A group cannot be added as a member of itself.",
      400,
    );
  }
};

export const createGroupMembership = async (
  input: CreateGroupMembershipServiceInput,
  dependencies: CreateGroupMembershipDependencies,
): Promise<CreateGroupMembershipResponse> => {
  assertValidSubject(input);

  const occurredAt = dependencies.clock.now().toISOString();
  const groupMembershipId = dependencies.idGenerator.nextId();
  const auditEventId = dependencies.idGenerator.nextId();
  const outboxEventId = dependencies.idGenerator.nextId();

  const groupMembership: GroupMembershipState = {
    group_membership_id: groupMembershipId,
    tenant_id: input.tenant_id,
    group_id: input.group_id,
    member_principal_id: input.member_principal_id,
    member_group_id: input.member_group_id,
    membership_source: input.membership_source,
    created_at: occurredAt,
    updated_at: occurredAt,
    created_by: input.actor_subject,
    updated_by: input.actor_subject,
  };

  await dependencies.groupMembershipRepository.createGroupMembership({
    group_membership: groupMembership,
    audit_event_id: auditEventId,
    outbox_event_id: outboxEventId,
    actor_principal_id: input.actor_principal_id,
    actor_subject: input.actor_subject,
    reason: input.reason,
    correlation_id: groupMembershipId,
    reference_type: "group",
    reference_id: input.group_id,
    occurred_at: occurredAt,
  });

  return {
    group_membership: groupMembership,
    audit: {
      audit_event_id: auditEventId,
    },
  };
};