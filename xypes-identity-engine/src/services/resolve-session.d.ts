import type { ResolveSessionRequest, ResolveSessionResponse } from "@xypes-identity/shared";
import type { ResolveSessionDependencies } from "../domain/session-types.js";
export declare const resolveSession: (input: ResolveSessionRequest, dependencies: ResolveSessionDependencies) => Promise<ResolveSessionResponse>;
