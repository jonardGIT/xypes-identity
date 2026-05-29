import assert from "node:assert/strict";
import test from "node:test";

import type { AccessReviewFinding } from "@xypes-identity/shared";

import { buildApp } from "../app.js";
import type { AccessReviewRepository } from "../domain/access-review-types.js";

class StaticAccessReviewRepository implements AccessReviewRepository {
  constructor(private readonly findings: AccessReviewFinding[]) {}

  async listFindings(): Promise<AccessReviewFinding[]> {
    return this.findings;
  }
}

test("POST /v1/access-reviews/findings returns typed findings with explicit tenant context", async (t) => {
  const app = await buildApp({
    accessReviewRead: {
      accessReviewRepository: new StaticAccessReviewRepository([
        {
          finding_id: "ORPHANED_GROUP_OWNER:group-1",
          code: "ORPHANED_GROUP_OWNER",
          severity: "high",
          entity_type: "group",
          entity_id: "group-1",
          title: "Group finance-admins has an orphaned owner",
          detail: "The owner principal is no longer active in tenant scope for this group.",
          evidence_ids: ["group-1", "principal-owner"],
          observed_at: "2026-05-01T00:00:00.000Z",
          scope_type: "tenant",
          scope_application_id: null,
          scope_resource_type: null,
          scope_resource_id: null,
          owner_principal_id: "principal-owner",
          subject_principal_id: null,
          subject_group_id: null,
          role_binding_status: null,
          role_definition_id: null,
          role_definition_name: null,
          role_definition_status: null,
          approval_required: null,
          permission_ids: [],
        },
      ]),
      clock: {
        now: () => new Date("2026-05-28T12:00:00.000Z"),
      },
    },
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
    url: "/v1/access-reviews/findings",
    payload: {
      tenant_id: "tenant-1",
      stale_after_days: 30,
      finding_codes: ["ORPHANED_GROUP_OWNER"],
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    generated_at: "2026-05-28T12:00:00.000Z",
    stale_cutoff_at: "2026-04-28T12:00:00.000Z",
    findings: [
      {
        finding_id: "ORPHANED_GROUP_OWNER:group-1",
        code: "ORPHANED_GROUP_OWNER",
        severity: "high",
        entity_type: "group",
        entity_id: "group-1",
        title: "Group finance-admins has an orphaned owner",
        detail: "The owner principal is no longer active in tenant scope for this group.",
        evidence_ids: ["group-1", "principal-owner"],
        observed_at: "2026-05-01T00:00:00.000Z",
        scope_type: "tenant",
        scope_application_id: null,
        scope_resource_type: null,
        scope_resource_id: null,
        owner_principal_id: "principal-owner",
        subject_principal_id: null,
        subject_group_id: null,
        role_binding_status: null,
        role_definition_id: null,
        role_definition_name: null,
        role_definition_status: null,
        approval_required: null,
        permission_ids: [],
      },
    ],
  });
});