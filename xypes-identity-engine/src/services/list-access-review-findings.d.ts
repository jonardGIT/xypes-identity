import type { ListAccessReviewFindingsResponse } from "@xypes-identity/shared";
import type { ListAccessReviewFindingsDependencies, ListAccessReviewFindingsServiceInput } from "../domain/access-review-types.js";
export declare const listAccessReviewFindings: (input: ListAccessReviewFindingsServiceInput, dependencies: ListAccessReviewFindingsDependencies) => Promise<ListAccessReviewFindingsResponse>;
