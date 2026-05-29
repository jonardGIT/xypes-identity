import type { CreateApplicationErrorCode } from "@xypes-identity/shared";

export class CreateApplicationError extends Error {
  readonly code: CreateApplicationErrorCode;
  readonly statusCode: number;

  constructor(code: CreateApplicationErrorCode, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}