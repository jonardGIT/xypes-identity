import type { CreateGroupMembershipErrorCode } from "@xypes-identity/shared";
export declare class CreateGroupMembershipError extends Error {
    readonly code: CreateGroupMembershipErrorCode;
    readonly statusCode: number;
    constructor(code: CreateGroupMembershipErrorCode, message: string, statusCode: number);
}
