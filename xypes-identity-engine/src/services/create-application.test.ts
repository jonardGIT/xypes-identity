import assert from "node:assert/strict";
import test from "node:test";

import type {
  ApplicationRepository,
  CreateApplicationPersistenceInput,
  ListApplicationsRepositoryInput,
} from "../domain/application-types.js";
import { createApplication } from "./create-application.js";

class RecordingApplicationRepository implements ApplicationRepository {
  input: CreateApplicationPersistenceInput | null = null;

  async createApplication(input: CreateApplicationPersistenceInput): Promise<void> {
    this.input = input;
  }

  async listApplications(_input: ListApplicationsRepositoryInput) {
    return [];
  }
}

test("createApplication generates ids and persists an audited application", async () => {
  const repository = new RecordingApplicationRepository();
  const generatedIds = ["application-1", "audit-1", "outbox-1"];

  const result = await createApplication(
    {
      tenant_id: "tenant-1",
      slug: "billing",
      display_name: "Billing",
      actor_principal_id: "principal-1",
      actor_subject: "operator@example.com",
      reason: "Bootstrap application catalog",
    },
    {
      applicationRepository: repository,
      idGenerator: {
        nextId: () => {
          const nextId = generatedIds.shift();

          if (nextId === undefined) {
            throw new Error("No more test ids available.");
          }

          return nextId;
        },
      },
      clock: {
        now: () => new Date("2026-05-28T12:00:00.000Z"),
      },
    },
  );

  assert.deepEqual(result, {
    application: {
      application_id: "application-1",
      tenant_id: "tenant-1",
      slug: "billing",
      display_name: "Billing",
      status: "active",
      created_at: "2026-05-28T12:00:00.000Z",
      updated_at: "2026-05-28T12:00:00.000Z",
      created_by: "operator@example.com",
      updated_by: "operator@example.com",
    },
    audit: {
      audit_event_id: "audit-1",
    },
  });
  assert.deepEqual(repository.input, {
    application: result.application,
    audit_event_id: "audit-1",
    outbox_event_id: "outbox-1",
    actor_principal_id: "principal-1",
    actor_subject: "operator@example.com",
    reason: "Bootstrap application catalog",
    correlation_id: "application-1",
    reference_type: "tenant",
    reference_id: "tenant-1",
    occurred_at: "2026-05-28T12:00:00.000Z",
  });
});