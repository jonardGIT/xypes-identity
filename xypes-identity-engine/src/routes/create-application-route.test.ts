import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import { CreateApplicationError } from "../domain/application-errors.js";
import type {
  ApplicationRepository,
  CreateApplicationDependencies,
  CreateApplicationPersistenceInput,
} from "../domain/application-types.js";

class RecordingApplicationRepository implements ApplicationRepository {
  input: CreateApplicationPersistenceInput | null = null;

  constructor(private readonly error: Error | null = null) {}

  async createApplication(input: CreateApplicationPersistenceInput): Promise<void> {
    this.input = input;

    if (this.error !== null) {
      throw this.error;
    }
  }
}

const buildRouteDependencies = (
  repository: ApplicationRepository,
): CreateApplicationDependencies => ({
  applicationRepository: repository,
  idGenerator: {
    nextId: (() => {
      const ids = ["application-1", "audit-1", "outbox-1"];

      return () => {
        const nextId = ids.shift();

        if (nextId === undefined) {
          throw new Error("No more test ids available.");
        }

        return nextId;
      };
    })(),
  },
  clock: {
    now: () => new Date("2026-05-28T12:00:00.000Z"),
  },
});

test("POST /v1/applications returns the created application and audit reference", async (t) => {
  const repository = new RecordingApplicationRepository();
  const app = await buildApp({
    applicationCreate: buildRouteDependencies(repository),
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
      now: () => new Date("2026-05-28T12:00:00.000Z"),
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/applications",
    payload: {
      tenant_id: "tenant-1",
      slug: "billing",
      display_name: "Billing",
      actor_principal_id: "principal-1",
      actor_subject: "operator@example.com",
      reason: "Bootstrap application catalog",
    },
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), {
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
  assert.equal(repository.input?.application.slug, "billing");
});

test("POST /v1/applications maps duplicate tenant slugs to 409", async (t) => {
  const app = await buildApp({
    applicationCreate: buildRouteDependencies(
      new RecordingApplicationRepository(
        new CreateApplicationError(
          "APPLICATION_DUPLICATE_TENANT_SLUG",
          "An application with this slug already exists for the tenant.",
          409,
        ),
      ),
    ),
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
      now: () => new Date("2026-05-28T12:00:00.000Z"),
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/applications",
    payload: {
      tenant_id: "tenant-1",
      slug: "billing",
      display_name: "Billing",
      actor_principal_id: null,
      actor_subject: "operator@example.com",
      reason: "Bootstrap application catalog",
    },
  });

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.json(), {
    error: "Create Application Error",
    message: "An application with this slug already exists for the tenant.",
    statusCode: 409,
    code: "APPLICATION_DUPLICATE_TENANT_SLUG",
  });
});