import assert from "node:assert/strict";
import test from "node:test";

import type { ApplicationState } from "@xypes-identity/shared";

import { buildApp } from "../app.js";
import type {
  ApplicationRepository,
  CreateApplicationPersistenceInput,
  ListApplicationsDependencies,
  ListApplicationsRepositoryInput,
} from "../domain/application-types.js";

class RecordingApplicationRepository implements ApplicationRepository {
  listInput: ListApplicationsRepositoryInput | null = null;

  async createApplication(_input: CreateApplicationPersistenceInput): Promise<void> {
    throw new Error("unused in this test");
  }

  async listApplications(input: ListApplicationsRepositoryInput): Promise<ApplicationState[]> {
    this.listInput = input;

    return [
      {
        application_id: "application-1",
        tenant_id: input.tenant_id,
        slug: "billing",
        display_name: "Billing",
        status: "active",
        created_at: "2026-05-28T12:00:00.000Z",
        updated_at: "2026-05-28T12:00:00.000Z",
        created_by: "operator@example.com",
        updated_by: "operator@example.com",
      },
    ];
  }
}

const buildRouteDependencies = (
  repository: ApplicationRepository,
): ListApplicationsDependencies => ({
  applicationRepository: repository,
  clock: {
    now: () => new Date("2026-05-29T08:00:00.000Z"),
  },
});

test("POST /v1/applications/query returns tenant-scoped applications", async (t) => {
  const repository = new RecordingApplicationRepository();
  const app = await buildApp({
    applicationRead: buildRouteDependencies(repository),
    principalRepository: {
      async findBySubject() {
        throw new Error("unused in this test");
      },
      async findTenantMembership() {
        throw new Error("unused in this test");
      },
    },
    tokenVerifier: {
      async verify() {
        throw new Error("unused in this test");
      },
    },
    auditPublisher: {
      async publish() {
        throw new Error("unused in this test");
      },
    },
    decisionIdGenerator: {
      nextId: () => "unused",
    },
    clock: {
      now: () => new Date("2026-05-29T08:00:00.000Z"),
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/applications/query",
    payload: {
      tenant_id: "tenant-1",
      statuses: ["active"],
      limit: 25,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    generated_at: "2026-05-29T08:00:00.000Z",
    applications: [
      {
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
    ],
  });
  assert.deepEqual(repository.listInput, {
    tenant_id: "tenant-1",
    statuses: ["active"],
    limit: 25,
  });
});