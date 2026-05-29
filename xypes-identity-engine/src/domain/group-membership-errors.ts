import type { CreateGroupMembershipErrorCode } from "@xypes-identity/shared";

export class CreateGroupMembershipError extends Error {
  readonly code: CreateGroupMembershipErrorCode;
  readonly statusCode: number;

  constructor(code: CreateGroupMembershipErrorCode, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}