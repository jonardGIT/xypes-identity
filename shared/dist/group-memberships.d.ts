export type GroupMembershipSource = "manual" | "synced" | "rule_based";
export interface GroupMembershipState {
    group_membership_id: string;
    tenant_id: string;
    group_id: string;
    member_principal_id: string | null;
    member_group_id: string | null;
    membership_source: GroupMembershipSource;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
}
export interface CreateGroupMembershipRequest {
    tenant_id: string;
    group_id: string;
    member_principal_id: string | null;
    member_group_id: string | null;
    membership_source: GroupMembershipSource;
    actor_principal_id: string | null;
    actor_subject: string;
    reason: string;
}
export interface GroupMembershipAuditReference {
    audit_event_id: string;
}
export interface CreateGroupMembershipResponse {
    group_membership: GroupMembershipState;
    audit: GroupMembershipAuditReference;
}
export type CreateGroupMembershipErrorCode = "GROUP_MEMBERSHIP_SUBJECT_INVALID" | "GROUP_MEMBERSHIP_TARGET_GROUP_NOT_FOUND" | "GROUP_MEMBERSHIP_PRINCIPAL_NOT_FOUND" | "GROUP_MEMBERSHIP_MEMBER_GROUP_NOT_FOUND" | "GROUP_MEMBERSHIP_SELF_REFERENCE" | "GROUP_MEMBERSHIP_CYCLE_DETECTED";
