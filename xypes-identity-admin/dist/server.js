import { createXypesIdentityClient } from "@xypes-identity/sdk";
import { buildApp } from "./app.js";
import { readConfig } from "./config.js";
const config = readConfig();
const client = createXypesIdentityClient({
    baseUrl: config.engineBaseUrl,
});
const app = await buildApp({
    audit: client.audit,
    accessReviews: client.accessReviews,
    controlPlane: client.controlPlane,
    operations: client.operations,
});
await app.listen({
    host: config.host,
    port: config.port,
});
