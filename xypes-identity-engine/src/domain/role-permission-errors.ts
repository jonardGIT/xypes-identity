import type { AttachRolePermissionErrorCode } from "@xypes-identity/shared";

export class AttachRolePermissionError extends Error {
  readonly code: AttachRolePermissionErrorCode;
  readonly statusCode: number;

  constructor(code: AttachRolePermissionErrorCode, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}