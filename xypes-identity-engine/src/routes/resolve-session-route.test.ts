import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import { ResolveSessionError } from "../domain/auth-errors.js";
import type {
  AuditPublisher,
  Clock,
  DecisionIdGenerator,
  PrincipalRepository,
  ResolveSessionDependencies,
  SessionTokenVerifier,
  VerifiedSessionToken,
} from "../domain/session-types.js";

class InMemoryPrincipalRepository implements PrincipalRepository {
  constructor(
    private readonly principal: {
      principal_id: string;
      subject: string;
      email: string | null;
      status: "active" | "suspended";
    } | null,
    private readonly membership: {
      tenant_id: string;
      principal_id: string;
      status: "active" | "suspended";
    } | null,
  ) {}

  async findBySubject(subject: string) {
    if (this.principal?.subject !== subject) {
      return null;
    }

    return this.principal;
  }

  async findTenantMembership(input: { principalId: string; tenantId: string }) {
    if (
      this.membership?.principal_id !== input.principalId ||
      this.membership?.tenant_id !== input.tenantId
    ) {
      return null;
    }

    return this.membership;
  }
}

class StubTokenVerifier implements SessionTokenVerifier {
  constructor(private readonly subject: string) {}

  async verify() {
    return {
      subject: this.subject,
      email: "user@example.com",
      expires_at: 2_000_000_000,
    };
  }
}

class FailingTokenVerifier implements SessionTokenVerifier {
  constructor(private readonly error: ResolveSessionError) {}

  async verify(_token: string): Promise<VerifiedSessionToken> {
    throw this.error;
  }
}

class RecordingAuditPublisher implements AuditPublisher {
  events: Array<{ decision_id: string; tenant_id: string; principal_id: string }> = [];

  async publish(event: {
    decision_id: string;
    tenant_id: string;
    principal_id: string;
  }) {
    this.events.push(event);
  }
}

const fixedClock: Clock = {
  now: () => new Date("2026-05-27T00:00:00.000Z"),
};

const fixedDecisionIdGenerator: DecisionIdGenerator = {
  nextId: () => "decision-123",
};

const buildDependencies = (
  principalRepository: PrincipalRepository,
  auditPublisher: RecordingAuditPublisher,
  tokenVerifier: SessionTokenVerifier = new StubTokenVerifier("supabase-user-1"),
): ResolveSessionDependencies => ({
  principalRepository,
  tokenVerifier,
  auditPublisher,
  decisionIdGenerator: fixedDecisionIdGenerator,
  clock: fixedClock,
});

test("POST /v1/auth/resolve-session returns principal context", async (t) => {
  const auditPublisher = new RecordingAuditPublisher();
  const app = await buildApp(
    buildDependencies(
      new InMemoryPrincipalRepository(
        {
          principal_id: "principal-1",
          subject: "supabase-user-1",
          email: "user@example.com",
          status: "active",
        },
        {
          tenant_id: "tenant-1",
          principal_id: "principal-1",
          status: "active",
        },
      ),
      auditPublisher,
    ),
  );

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/auth/resolve-session",
    payload: {
      token: "signed-jwt",
      tenant_id: "tenant-1",
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    decision_id: "decision-123",
    principal: {
      principal_id: "principal-1",
      tenant_id: "tenant-1",
      subject: "supabase-user-1",
      email: "user@example.com",
      principal_status: "active",
      membership_status: "active",
    },
  });
  assert.deepEqual(auditPublisher.events, [
    {
      event_type: "principal.resolved",
      decision_id: "decision-123",
      tenant_id: "tenant-1",
      principal_id: "principal-1",
      subject: "supabase-user-1",
      occurred_at: "2026-05-27T00:00:00.000Z",
    },
  ]);
});

test("POST /v1/auth/resolve-session maps missing principal to 404", async (t) => {
  const auditPublisher = new RecordingAuditPublisher();
  const app = await buildApp(buildDependencies(new InMemoryPrincipalRepository(null, null), auditPublisher));

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/auth/resolve-session",
    payload: {
      token: "signed-jwt",
      tenant_id: "tenant-1",
    },
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), {
    error: "Resolve Session Error",
    message: "No principal is registered for the supplied subject.",
    statusCode: 404,
    code: "AUTH_PRINCIPAL_NOT_FOUND",
  });
  assert.deepEqual(auditPublisher.events, []);
});

test("POST /v1/auth/resolve-session maps JWKS unavailability to 503", async (t) => {
  const auditPublisher = new RecordingAuditPublisher();
  const app = await buildApp(
    buildDependencies(
      new InMemoryPrincipalRepository(null, null),
      auditPublisher,
      new FailingTokenVerifier(
        new ResolveSessionError(
          "AUTH_JWKS_UNAVAILABLE",
          "Token verification is temporarily unavailable because the JWKS source could not be reached.",
          503,
        ),
      ),
    ),
  );

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/auth/resolve-session",
    payload: {
      token: "signed-jwt",
      tenant_id: "tenant-1",
    },
  });

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), {
    error: "Resolve Session Error",
    message: "Token verification is temporarily unavailable because the JWKS source could not be reached.",
    statusCode: 503,
    code: "AUTH_JWKS_UNAVAILABLE",
  });
  assert.deepEqual(auditPublisher.events, []);
});