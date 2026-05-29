import type { CreatePermissionErrorCode } from "@xypes-identity/shared";

export class CreatePermissionError extends Error {
  readonly code: CreatePermissionErrorCode;
  readonly statusCode: number;

  constructor(code: CreatePermissionErrorCode, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}