import type {
  AccessReviewFinding,
  AccessReviewFindingCode,
  ListAccessReviewFindingsRequest,
} from "@xypes-identity/shared";

import type { Clock } from "./session-types.js";

export interface AccessReviewRepositoryInput {
  tenant_id: string;
  stale_cutoff_at: string;
  finding_codes?: AccessReviewFindingCode[];
}

export interface AccessReviewRepository {
  listFindings(input: AccessReviewRepositoryInput): Promise<AccessReviewFinding[]>;
}

export interface ListAccessReviewFindingsDependencies {
  accessReviewRepository: AccessReviewRepository;
  clock: Clock;
}

export interface ListAccessReviewFindingsServiceInput extends ListAccessReviewFindingsRequest {}