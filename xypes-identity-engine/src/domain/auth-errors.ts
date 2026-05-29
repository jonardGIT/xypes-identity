import type { ResolveSessionErrorCode } from "@xypes-identity/shared";

export class ResolveSessionError extends Error {
  readonly code: ResolveSessionErrorCode;
  readonly statusCode: number;

  constructor(code: ResolveSessionErrorCode, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}