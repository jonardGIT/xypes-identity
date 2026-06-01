import { createPrivateKey } from "node:crypto";
import { readFile } from "node:fs/promises";
import { SignJWT } from "jose";

const subject =
  process.env.TOKEN_SUBJECT ?? process.env.TOKEN_SUB ?? "local-active-member";
const email = process.env.TOKEN_EMAIL ?? "active.member@example.test";
const issuer = process.env.TOKEN_ISSUER ?? "http://jwks-mock";
const audience = process.env.TOKEN_AUDIENCE ?? "local-dev";
const expiresIn = process.env.TOKEN_EXPIRES_IN ?? "1h";
const privateKeyPath =
  process.env.TOKEN_PRIVATE_KEY_PATH ??
  new URL("./local-dev-private-key.jwk.json", import.meta.url);

const privateJwk = JSON.parse(await readFile(privateKeyPath, "utf8"));
const algorithm = typeof privateJwk.alg === "string" ? privateJwk.alg : "EdDSA";
const keyId = process.env.TOKEN_KEY_ID ?? privateJwk.kid ?? "local-dev-key";
const privateKey = createPrivateKey({
  key: privateJwk,
  format: "jwk",
});

const payload = {};

if (email.length > 0) {
  payload.email = email;
}

const token = await new SignJWT(payload)
  .setProtectedHeader({ alg: algorithm, kid: keyId })
  .setIssuer(issuer)
  .setAudience(audience)
  .setSubject(subject)
  .setIssuedAt()
  .setExpirationTime(expiresIn)
  .sign(privateKey);

process.stdout.write(`${token}\n`);
