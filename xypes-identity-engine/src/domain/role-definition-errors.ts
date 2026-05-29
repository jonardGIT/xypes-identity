import type {
  CreateRoleDefinitionErrorCode,
  UpdateRoleDefinitionStatusErrorCode,
} from "@xypes-identity/shared";

export class CreateRoleDefinitionError extends Error {
  readonly code: CreateRoleDefinitionErrorCode;
  readonly statusCode: number;

  constructor(code: CreateRoleDefinitionErrorCode, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class UpdateRoleDefinitionStatusError extends Error {
  readonly code: UpdateRoleDefinitionStatusErrorCode;
  readonly statusCode: number;

  constructor(code: UpdateRoleDefinitionStatusErrorCode, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}