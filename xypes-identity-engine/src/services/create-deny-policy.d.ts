import type { CreateDenyPolicyResponse } from "@xypes-identity/shared";
import type { CreateDenyPolicyDependencies, CreateDenyPolicyServiceInput } from "../domain/deny-policy-types.js";
export declare const createDenyPolicy: (input: CreateDenyPolicyServiceInput, dependencies: CreateDenyPolicyDependencies) => Promise<CreateDenyPolicyResponse>;
