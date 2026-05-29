import type { CreateGroupErrorCode } from "@xypes-identity/shared";

export class CreateGroupError extends Error {
  readonly code: CreateGroupErrorCode;
  readonly statusCode: number;

  constructor(code: CreateGroupErrorCode, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}