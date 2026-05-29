import type { CreateApplicationResponse } from "@xypes-identity/shared";
import type { CreateApplicationDependencies, CreateApplicationServiceInput } from "../domain/application-types.js";
export declare const createApplication: (input: CreateApplicationServiceInput, dependencies: CreateApplicationDependencies) => Promise<CreateApplicationResponse>;
