import Fastify from "fastify";
import {
  createFastifyAuthorizationHook,
  createFastifySessionHook,
  createXypesIdentityClient,
  isXypesIdentityAuthorizationDeniedError,
  isXypesIdentityApiError,
  type XypesIdentityRequestAuthorizationContextCarrier,
} from "@xypes-identity/sdk";

declare module "fastify" {
  interface FastifyRequest extends XypesIdentityRequestAuthorizationContextCarrier {}
}

const client = createXypesIdentityClient({
  baseUrl: process.env.XYPES_IDENTITY_BASE_URL ?? "http://localhost:3000",
});
const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? "4000");

app.get("/ready", async () => ({ status: "ok" }));

app.setErrorHandler((error, request, reply) => {
  if (isXypesIdentityAuthorizationDeniedError(error)) {
    reply.code(403).send({
      outcome: error.authorization.outcome,
      decision_id: error.decisionId,
      reason_code: error.reasonCode,
      deny_source: error.authorization.deny_source ?? null,
    });
    return;
  }

  if (isXypesIdentityApiError(error)) {
    reply.code(error.statusCode).send({
      code: error.code,
      error: error.error,
      message: error.message,
    });
    return;
  }

  request.log.error(error);
  reply.code(500).send({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unexpected sample app error.",
  });
});

void app.register(async (tenantScopedApp) => {
  tenantScopedApp.addHook(
    "preHandler",
    createFastifySessionHook({
      client,
      resolveTenantId: (request) =>
        String((request.params as { tenantId?: string }).tenantId ?? ""),
      resolveToken: (request) =>
        request.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "",
    }),
  );

  tenantScopedApp.get<{
    Params: { tenantId: string; invoiceId: string };
  }>(
    "/invoices/:invoiceId",
    {
      preHandler: createFastifyAuthorizationHook({
        client,
        resolveApplicationId: () => "billing-app",
        resolveAction: () => "invoices.read",
        resolveResourceType: () => "invoice",
        resolveResourceId: (request) =>
          (request.params as { invoiceId: string }).invoiceId,
      }),
    },
    async (request) => ({
      invoiceId: request.params.invoiceId,
      tenant_id: request.xypesIdentity?.principal.tenant_id,
      principal_id: request.xypesIdentity?.principal.principal_id,
      decision_id: request.xypesIdentityAuthorization?.decision_id,
    }),
  );
}, { prefix: "/tenants/:tenantId" });

const start = async (): Promise<void> => {
  try {
    await app.listen({ host: "0.0.0.0", port });
    app.log.info(
      `Fastify sample listening on http://localhost:${port}/tenants/demo-tenant/invoices/inv_123`,
    );
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
};

void start();