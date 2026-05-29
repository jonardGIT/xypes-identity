import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../app.js";
import { CreateRoleDefinitionError } from "../domain/role-definition-errors.js";
class RecordingRoleDefinitionRepository {
    error;
    input = null;
    constructor(error = null) {
        this.error = error;
    }
    async createRoleDefinition(input) {
        this.input = input;
        if (this.error !== null) {
            throw this.error;
        }
    }
    async updateRoleDefinitionStatus(_input) {
        throw new Error("unused in this test");
    }
}
const buildRouteDependencies = (repository) => ({
    roleDefinitionRepository: repository,
    idGenerator: {
        nextId: (() => {
            const ids = ["role-1", "audit-1", "outbox-1"];
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
test("POST /v1/role-definitions returns the created role definition and audit reference", async (t) => {
    const repository = new RecordingRoleDefinitionRepository();
    const app = await buildApp({
        roleDefinitionCreate: buildRouteDependencies(repository),
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
        url: "/v1/role-definitions",
        payload: {
            tenant_id: "tenant-1",
            application_id: "application-1",
            name: "billing-admin",
            description: "Can manage billing settings",
            approval_required: false,
            actor_principal_id: "principal-1",
            actor_subject: "operator@example.com",
            reason: "Initial bootstrap role",
        },
    });
    assert.equal(response.statusCode, 201);
    assert.deepEqual(response.json(), {
        role_definition: {
            role_definition_id: "role-1",
            tenant_id: "tenant-1",
            application_id: "application-1",
            name: "billing-admin",
            description: "Can manage billing settings",
            status: "draft",
            approval_required: false,
            created_at: "2026-05-28T12:00:00.000Z",
            updated_at: "2026-05-28T12:00:00.000Z",
            created_by: "operator@example.com",
            updated_by: "operator@example.com",
        },
        audit: {
            audit_event_id: "audit-1",
        },
    });
    assert.equal(repository.input?.role_definition.name, "billing-admin");
});
test("POST /v1/role-definitions maps duplicate names to 409", async (t) => {
    const app = await buildApp({
        roleDefinitionCreate: buildRouteDependencies(new RecordingRoleDefinitionRepository(new CreateRoleDefinitionError("ROLE_DEFINITION_DUPLICATE_NAME", "A role definition with this name already exists for the application.", 409))),
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
        url: "/v1/role-definitions",
        payload: {
            tenant_id: "tenant-1",
            application_id: "application-1",
            name: "billing-admin",
            description: null,
            approval_required: false,
            actor_principal_id: null,
            actor_subject: "operator@example.com",
            reason: "Initial bootstrap role",
        },
    });
    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.json(), {
        error: "Create Role Definition Error",
        message: "A role definition with this name already exists for the application.",
        statusCode: 409,
        code: "ROLE_DEFINITION_DUPLICATE_NAME",
    });
});
