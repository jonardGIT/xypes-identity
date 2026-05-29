import type {
  AccessReviewFinding,
  AccessReviewFindingCode,
  ListAccessReviewFindingsResponse,
} from "@xypes-identity/shared";

import type {
  ListAccessReviewFindingsDependencies,
  ListAccessReviewFindingsServiceInput,
} from "../domain/access-review-types.js";

const DEFAULT_FINDINGS_LIMIT = 100;

const severityRank: Record<AccessReviewFinding["severity"], number> = {
  high: 0,
  medium: 1,
};

const normalizeFindingCodes = (
  findingCodes: AccessReviewFindingCode[] | undefined,
): AccessReviewFindingCode[] | undefined => {
  if (findingCodes === undefined || findingCodes.length === 0) {
    return undefined;
  }

  return [...new Set(findingCodes)].sort();
};

const sortFindings = (findings: AccessReviewFinding[]): AccessReviewFinding[] =>
  [...findings].sort((left, right) => {
    const severityDifference = severityRank[left.severity] - severityRank[right.severity];

    if (severityDifference !== 0) {
      return severityDifference;
    }

    return (
      left.code.localeCompare(right.code)
      || left.entity_type.localeCompare(right.entity_type)
      || left.entity_id.localeCompare(right.entity_id)
      || left.finding_id.localeCompare(right.finding_id)
    );
  });

export const listAccessReviewFindings = async (
  input: ListAccessReviewFindingsServiceInput,
  dependencies: ListAccessReviewFindingsDependencies,
): Promise<ListAccessReviewFindingsResponse> => {
  const generatedAtDate = dependencies.clock.now();
  const generatedAt = generatedAtDate.toISOString();
  const staleCutoffAt = new Date(
    generatedAtDate.getTime() - input.stale_after_days * 24 * 60 * 60 * 1000,
  ).toISOString();
  const findings = await dependencies.accessReviewRepository.listFindings({
    tenant_id: input.tenant_id,
    stale_cutoff_at: staleCutoffAt,
    finding_codes: normalizeFindingCodes(input.finding_codes),
  });

  return {
    generated_at: generatedAt,
    stale_cutoff_at: staleCutoffAt,
    findings: sortFindings(findings).slice(0, input.limit ?? DEFAULT_FINDINGS_LIMIT),
  };
};