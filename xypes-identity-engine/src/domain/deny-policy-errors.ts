import type { CreateDenyPolicyErrorCode } from "@xypes-identity/shared";

export class CreateDenyPolicyError extends Error {
  readonly code: CreateDenyPolicyErrorCode;
  readonly statusCode: number;

  constructor(code: CreateDenyPolicyErrorCode, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}