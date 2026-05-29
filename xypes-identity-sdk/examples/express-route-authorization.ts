import express from "express";
import {
  createExpressAuthorizationMiddleware,
  createExpressSessionMiddleware,
  createXypesIdentityClient,
  isXypesIdentityAuthorizationDeniedError,
  isXypesIdentityApiError,
  type XypesIdentityRequestAuthorizationContextCarrier,
} from "@xypes-identity/sdk";

declare global {
  namespace Express {
    interface Request extends XypesIdentityRequestAuthorizationContextCarrier {}
  }
}

const client = createXypesIdentityClient({
  baseUrl: process.env.XYPES_IDENTITY_BASE_URL ?? "http://localhost:3000",
});
const app = express();
const port = Number(process.env.PORT ?? "4000");

app.use(express.json());

app.get("/ready", (_request, response) => {
  response.json({ status: "ok" });
});

app.use(
  "/tenants/:tenantId",
  createExpressSessionMiddleware({
    client,
    resolveTenantId: (request) => String(request.params.tenantId ?? ""),
    resolveToken: (request) =>
      request.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "",
  }),
);

app.get(
  "/tenants/:tenantId/invoices/:invoiceId",
  createExpressAuthorizationMiddleware({
    client,
    resolveApplicationId: () => "billing-app",
    resolveAction: () => "invoices.read",
    resolveResourceType: () => "invoice",
    resolveResourceId: (request) => request.params.invoiceId,
  }),
  (request, response) => {
    response.json({
      invoiceId: request.params.invoiceId,
      tenant_id: request.xypesIdentity?.principal.tenant_id,
      principal_id: request.xypesIdentity?.principal.principal_id,
      decision_id: request.xypesIdentityAuthorization?.decision_id,
    });
  },
);

app.use(((error, _request, response, _next) => {
  if (isXypesIdentityAuthorizationDeniedError(error)) {
    response.status(403).json({
      outcome: error.authorization.outcome,
      decision_id: error.decisionId,
      reason_code: error.reasonCode,
      deny_source: error.authorization.deny_source ?? null,
    });
    return;
  }

  if (isXypesIdentityApiError(error)) {
    response.status(error.statusCode).json({
      code: error.code,
      error: error.error,
      message: error.message,
    });
    return;
  }

  response.status(500).json({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unexpected sample app error.",
  });
}) as express.ErrorRequestHandler);

app.listen(port, () => {
  console.log(
    `Express sample listening on http://localhost:${port}/tenants/demo-tenant/invoices/inv_123`,
  );
});