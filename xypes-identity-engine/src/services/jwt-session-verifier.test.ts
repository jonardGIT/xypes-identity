import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { generateKeyPair, exportJWK, SignJWT } from "jose";

import { ResolveSessionError } from "../domain/auth-errors.js";
import { JwtSessionVerifier } from "./jwt-session-verifier.js";

test("JwtSessionVerifier verifies a valid token", async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.use = "sig";
  publicJwk.alg = "RS256";
  publicJwk.kid = "test-key";

  const server = createServer((request, response) => {
    if (request.url === "/.well-known/jwks.json") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ keys: [publicJwk] }));
      return;
    }

    response.statusCode = 404;
    response.end();
  });

  server.listen(0);
  await once(server, "listening");

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Unexpected server address.");
  }

  const verifier = new JwtSessionVerifier({
    issuer: "https://example.supabase.co/auth/v1",
    audience: "authenticated",
    jwksUrl: `http://127.0.0.1:${address.port}/.well-known/jwks.json`,
  });

  const token = await new SignJWT({ email: "user@example.com" })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer("https://example.supabase.co/auth/v1")
    .setAudience("authenticated")
    .setSubject("supabase-user-1")
    .setExpirationTime("10m")
    .sign(privateKey);

  const result = await verifier.verify(token);
  assert.deepEqual(result, {
    subject: "supabase-user-1",
    email: "user@example.com",
    expires_at: result.expires_at,
  });
  assert.equal(typeof result.expires_at, "number");

  server.close();
});

test("JwtSessionVerifier rejects expired tokens", async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.use = "sig";
  publicJwk.alg = "RS256";
  publicJwk.kid = "test-key";

  const server = createServer((request, response) => {
    if (request.url === "/.well-known/jwks.json") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ keys: [publicJwk] }));
      return;
    }

    response.statusCode = 404;
    response.end();
  });

  server.listen(0);
  await once(server, "listening");

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Unexpected server address.");
  }

  const verifier = new JwtSessionVerifier({
    issuer: "https://example.supabase.co/auth/v1",
    audience: "authenticated",
    jwksUrl: `http://127.0.0.1:${address.port}/.well-known/jwks.json`,
  });

  const token = await new SignJWT({ email: "user@example.com" })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer("https://example.supabase.co/auth/v1")
    .setAudience("authenticated")
    .setSubject("supabase-user-1")
    .setExpirationTime("-1m")
    .sign(privateKey);

  await assert.rejects(verifier.verify(token), (error: unknown) => {
    assert.ok(error instanceof ResolveSessionError);
    assert.equal(error.code, "AUTH_TOKEN_EXPIRED");
    return true;
  });

  server.close();
});

test("JwtSessionVerifier surfaces JWKS unavailability as a deterministic outage code", async () => {
  const { privateKey } = await generateKeyPair("RS256");
  const verifier = new JwtSessionVerifier({
    issuer: "https://example.supabase.co/auth/v1",
    audience: "authenticated",
    jwksUrl: "http://127.0.0.1:1/.well-known/jwks.json",
  });

  const token = await new SignJWT({ email: "user@example.com" })
    .setProtectedHeader({ alg: "RS256", kid: "missing-jwks-key" })
    .setIssuer("https://example.supabase.co/auth/v1")
    .setAudience("authenticated")
    .setSubject("supabase-user-1")
    .setExpirationTime("10m")
    .sign(privateKey);

  await assert.rejects(verifier.verify(token), (error: unknown) => {
    assert.ok(error instanceof ResolveSessionError);
    assert.equal(error.code, "AUTH_JWKS_UNAVAILABLE");
    assert.equal(error.statusCode, 503);
    return true;
  });
});