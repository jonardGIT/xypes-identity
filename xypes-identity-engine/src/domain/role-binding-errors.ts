import type {
  CreateRoleBindingErrorCode,
  UpdateRoleBindingStatusErrorCode,
} from "@xypes-identity/shared";

export class CreateRoleBindingError extends Error {
  readonly code: CreateRoleBindingErrorCode;
  readonly statusCode: number;

  constructor(code: CreateRoleBindingErrorCode, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class UpdateRoleBindingStatusError extends Error {
  readonly code: UpdateRoleBindingStatusErrorCode;
  readonly statusCode: number;

  constructor(code: UpdateRoleBindingStatusErrorCode, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}