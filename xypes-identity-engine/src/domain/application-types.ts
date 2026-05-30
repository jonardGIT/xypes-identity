import type {
  ApplicationState,
  CreateApplicationRequest,
  ListApplicationsRequest,
} from "@xypes-identity/shared";

import type { Clock, DecisionIdGenerator } from "./session-types.js";

export interface CreateApplicationPersistenceInput {
  application: ApplicationState;
  audit_event_id: string;
  outbox_event_id: string;
  actor_principal_id: string | null;
  actor_subject: string;
  reason: string;
  correlation_id: string;
  reference_type: string;
  reference_id: string;
  occurred_at: string;
}

export interface ApplicationRepository {
  createApplication(input: CreateApplicationPersistenceInput): Promise<void>;
  listApplications(input: ListApplicationsRepositoryInput): Promise<ApplicationState[]>;
}

export interface CreateApplicationDependencies {
  applicationRepository: ApplicationRepository;
  idGenerator: DecisionIdGenerator;
  clock: Clock;
}

export interface CreateApplicationServiceInput extends CreateApplicationRequest {}

export interface ListApplicationsDependencies {
  applicationRepository: ApplicationRepository;
  clock: Clock;
}

export interface ListApplicationsRepositoryInput extends ListApplicationsRequest {}

export interface ListApplicationsServiceInput extends ListApplicationsRequest {}