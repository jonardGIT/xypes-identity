import assert from "node:assert/strict";
import test from "node:test";

import {
  XypesIdentityApiError,
  createExpressSessionMiddleware,
  createFastifySessionHook,
  createXypesIdentityClient,
  type XypesIdentityRequestSessionCarrier,
} from "../src/index.js";

type FastifySessionRequest = XypesIdentityRequestSessionCarrier & {
  headers: { authorization: string };
  params: { tenantId: string };
};

type ExpressSessionRequest = XypesIdentityRequestSessionCarrier & {
  tenantId: string;
  token: string;
};

const createJsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

test("createFastifySessionHook resolves the session and attaches it to the request", async () => {
  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test",
    fetch: async (_input, init) => {
      assert.deepEqual(JSON.parse(String(init?.body)), {
        tenant_id: "tenant_fastify",
        token: "fastify-token",
      });

      return createJsonResponse(
        {
          decision_id: "dec_fastify",
          principal: {
            principal_id: "principal_fastify",
            tenant_id: "tenant_fastify",
            subject: "fastify@example.com",
            email: "fastify@example.com",
            principal_status: "active",
            membership_status: "active",
          },
        },
        200,
      );
    },
  });

  const hook = createFastifySessionHook<FastifySessionRequest>({
    client,
    resolveTenantId: async (request) => request.params.tenantId,
    resolveToken: (request) => request.headers.authorization.replace(/^Bearer\s+/i, ""),
  });

  const request: FastifySessionRequest = {
    headers: { authorization: "Bearer fastify-token" },
    params: { tenantId: "tenant_fastify" },
  };

  await hook(request, {});

  assert.deepEqual(request.xypesIdentity, {
    decision_id: "dec_fastify",
    principal: {
      principal_id: "principal_fastify",
      tenant_id: "tenant_fastify",
      subject: "fastify@example.com",
      email: "fastify@example.com",
      principal_status: "active",
      membership_status: "active",
    },
  });
});

test("createExpressSessionMiddleware resolves the session and attaches it to the request", async () => {
  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test",
    fetch: async (_input, init) => {
      assert.deepEqual(JSON.parse(String(init?.body)), {
        tenant_id: "tenant_express",
        token: "express-token",
      });

      return createJsonResponse(
        {
          decision_id: "dec_express",
          principal: {
            principal_id: "principal_express",
            tenant_id: "tenant_express",
            subject: "express@example.com",
            email: null,
            principal_status: "active",
            membership_status: "active",
          },
        },
        200,
      );
    },
  });

  const middleware = createExpressSessionMiddleware<ExpressSessionRequest>({
    client,
    resolveTenantId: (request) => request.tenantId,
    resolveToken: async (request) => request.token,
  });

  const request: ExpressSessionRequest = {
    tenantId: "tenant_express",
    token: "express-token",
  };

  await new Promise<void>((resolve, reject) => {
    middleware(request, {}, (error?: unknown) => {
      if (error !== undefined) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  assert.deepEqual(request.xypesIdentity, {
    decision_id: "dec_express",
    principal: {
      principal_id: "principal_express",
      tenant_id: "tenant_express",
      subject: "express@example.com",
      email: null,
      principal_status: "active",
      membership_status: "active",
    },
  });
});

test("createExpressSessionMiddleware forwards client errors to next", async () => {
  const client = createXypesIdentityClient({
    baseUrl: "https://engine.example.test",
    fetch: async () =>
      createJsonResponse(
        {
          error: "Resolve Session Error",
          message: "Session token is invalid",
          statusCode: 401,
          code: "AUTH_INVALID_TOKEN",
        },
        401,
      ),
  });

  const middleware = createExpressSessionMiddleware({
    client,
    resolveTenantId: () => "tenant_express",
    resolveToken: () => "invalid-token",
  });

  await new Promise<void>((resolve, reject) => {
    middleware({} as XypesIdentityRequestSessionCarrier, {}, (error?: unknown) => {
      try {
        assert.ok(error instanceof XypesIdentityApiError);
        assert.equal(error.statusCode, 401);
        assert.equal(error.code, "AUTH_INVALID_TOKEN");
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });
});