import type { ListApplicationsResponse } from "@xypes-identity/shared";

import type {
  ListApplicationsDependencies,
  ListApplicationsServiceInput,
} from "../domain/application-types.js";

export const listApplications = async (
  input: ListApplicationsServiceInput,
  dependencies: ListApplicationsDependencies,
): Promise<ListApplicationsResponse> => ({
  generated_at: dependencies.clock.now().toISOString(),
  applications: await dependencies.applicationRepository.listApplications(input),
});