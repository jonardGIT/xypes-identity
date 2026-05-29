import test from "node:test";
import assert from "node:assert/strict";
import { ResolveSessionError } from "../domain/auth-errors.js";
import { resolveSession } from "./resolve-session.js";
class RecordingOperationalTelemetry {
    resolveSessionInputs = [];
    async recordResolveSession(input) {
        this.resolveSessionInputs.push(input);
    }
    async recordAuthorization() { }
    async recordReplayBatch() { }
    async getSnapshot() {
        throw new Error("unused in this test");
    }
}
class InMemoryPrincipalRepository {
    principal;
    membership;
    constructor(principal, membership) {
        this.principal = principal;
        this.membership = membership;
    }
    async findBySubject(subject) {
        if (this.principal?.subject !== subject) {
            return null;
        }
        return this.principal;
    }
    async findTenantMembership(input) {
        if (this.membership?.principal_id !== input.principalId ||
            this.membership?.tenant_id !== input.tenantId) {
            return null;
        }
        return this.membership;
    }
}
class StubTokenVerifier {
    subject;
    constructor(subject) {
        this.subject = subject;
    }
    async verify() {
        return {
            subject: this.subject,
            email: "user@example.com",
            expires_at: 2_000_000_000,
        };
    }
}
class RecordingAuditPublisher {
    events = [];
    async publish(event) {
        this.events.push(event);
    }
}
class RecordingResolveSessionLogger {
    infoEntries = [];
    warnEntries = [];
    info(bindings, message) {
        this.infoEntries.push({ bindings, message });
    }
    warn(bindings, message) {
        this.warnEntries.push({ bindings, message });
    }
}
const fixedClock = {
    now: () => new Date("2026-05-27T00:00:00.000Z"),
};
const fixedDecisionIdGenerator = {
    nextId: () => "decision-123",
};
const buildDependencies = (principalRepository, auditPublisher, tokenVerifier = new StubTokenVerifier("supabase-user-1"), sessionLogger, operationalTelemetry) => ({
    principalRepository,
    tokenVerifier,
    auditPublisher,
    decisionIdGenerator: fixedDecisionIdGenerator,
    clock: fixedClock,
    sessionLogger,
    operationalTelemetry,
});
test("resolveSession returns principal context and emits an audit event", async () => {
    const auditPublisher = new RecordingAuditPublisher();
    const sessionLogger = new RecordingResolveSessionLogger();
    const operationalTelemetry = new RecordingOperationalTelemetry();
    const dependencies = buildDependencies(new InMemoryPrincipalRepository({
        principal_id: "principal-1",
        subject: "supabase-user-1",
        email: "user@example.com",
        status: "active",
    }, {
        tenant_id: "tenant-1",
        principal_id: "principal-1",
        status: "active",
    }), auditPublisher, new StubTokenVerifier("supabase-user-1"), sessionLogger, operationalTelemetry);
    const result = await resolveSession({
        token: "signed-jwt",
        tenant_id: "tenant-1",
    }, dependencies);
    assert.deepEqual(result, {
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
    assert.deepEqual(sessionLogger.infoEntries, [
        {
            bindings: {
                event_name: "resolve_session.result",
                tenant_id: "tenant-1",
                subject: "supabase-user-1",
                principal_id: "principal-1",
                decision_id: "decision-123",
                outcome: "resolved",
                error_code: null,
                status_code: null,
            },
            message: "Resolve session completed.",
        },
    ]);
    assert.deepEqual(sessionLogger.warnEntries, []);
    assert.equal(operationalTelemetry.resolveSessionInputs.length, 1);
    assert.equal(operationalTelemetry.resolveSessionInputs[0]?.outcome, "success");
});
test("resolveSession rejects an unknown principal", async () => {
    const auditPublisher = new RecordingAuditPublisher();
    const sessionLogger = new RecordingResolveSessionLogger();
    const operationalTelemetry = new RecordingOperationalTelemetry();
    const dependencies = buildDependencies(new InMemoryPrincipalRepository(null, null), auditPublisher, new StubTokenVerifier("supabase-user-1"), sessionLogger, operationalTelemetry);
    await assert.rejects(resolveSession({
        token: "signed-jwt",
        tenant_id: "tenant-1",
    }, dependencies), (error) => {
        assert.ok(error instanceof ResolveSessionError);
        assert.equal(error.code, "AUTH_PRINCIPAL_NOT_FOUND");
        return true;
    });
    assert.deepEqual(sessionLogger.infoEntries, []);
    assert.deepEqual(sessionLogger.warnEntries, [
        {
            bindings: {
                event_name: "resolve_session.result",
                tenant_id: "tenant-1",
                subject: "supabase-user-1",
                principal_id: null,
                decision_id: null,
                outcome: "error",
                error_code: "AUTH_PRINCIPAL_NOT_FOUND",
                status_code: 404,
            },
            message: "Resolve session failed.",
        },
    ]);
    assert.equal(operationalTelemetry.resolveSessionInputs.length, 1);
    assert.equal(operationalTelemetry.resolveSessionInputs[0]?.outcome, "failure");
    assert.equal(operationalTelemetry.resolveSessionInputs[0]?.error_code, "AUTH_PRINCIPAL_NOT_FOUND");
});
test("resolveSession rejects a suspended principal", async () => {
    const auditPublisher = new RecordingAuditPublisher();
    const dependencies = buildDependencies(new InMemoryPrincipalRepository({
        principal_id: "principal-1",
        subject: "supabase-user-1",
        email: "user@example.com",
        status: "suspended",
    }, {
        tenant_id: "tenant-1",
        principal_id: "principal-1",
        status: "active",
    }), auditPublisher);
    await assert.rejects(resolveSession({
        token: "signed-jwt",
        tenant_id: "tenant-1",
    }, dependencies), (error) => {
        assert.ok(error instanceof ResolveSessionError);
        assert.equal(error.code, "AUTH_PRINCIPAL_SUSPENDED");
        return true;
    });
});
test("resolveSession rejects a wrong tenant", async () => {
    const auditPublisher = new RecordingAuditPublisher();
    const dependencies = buildDependencies(new InMemoryPrincipalRepository({
        principal_id: "principal-1",
        subject: "supabase-user-1",
        email: "user@example.com",
        status: "active",
    }, null), auditPublisher);
    await assert.rejects(resolveSession({
        token: "signed-jwt",
        tenant_id: "tenant-2",
    }, dependencies), (error) => {
        assert.ok(error instanceof ResolveSessionError);
        assert.equal(error.code, "AUTH_TENANT_MEMBERSHIP_NOT_FOUND");
        return true;
    });
});
test("resolveSession rejects a suspended tenant membership", async () => {
    const auditPublisher = new RecordingAuditPublisher();
    const dependencies = buildDependencies(new InMemoryPrincipalRepository({
        principal_id: "principal-1",
        subject: "supabase-user-1",
        email: "user@example.com",
        status: "active",
    }, {
        tenant_id: "tenant-1",
        principal_id: "principal-1",
        status: "suspended",
    }), auditPublisher);
    await assert.rejects(resolveSession({
        token: "signed-jwt",
        tenant_id: "tenant-1",
    }, dependencies), (error) => {
        assert.ok(error instanceof ResolveSessionError);
        assert.equal(error.code, "AUTH_TENANT_MEMBERSHIP_SUSPENDED");
        return true;
    });
});
