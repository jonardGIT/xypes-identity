import { createRemoteJWKSet, jwtVerify } from "jose";

import { ResolveSessionError } from "../domain/auth-errors.js";
import type { SessionTokenVerifier, VerifiedSessionToken } from "../domain/session-types.js";

export interface JwtVerifierConfig {
  issuer: string;
  audience: string;
  jwksUrl: string;
}

export class JwtSessionVerifier implements SessionTokenVerifier {
  readonly #issuer: string;
  readonly #audience: string;
  readonly #jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(config: JwtVerifierConfig) {
    this.#issuer = config.issuer;
    this.#audience = config.audience;
    this.#jwks = createRemoteJWKSet(new URL(config.jwksUrl));
  }

  async verify(token: string): Promise<VerifiedSessionToken> {
    try {
      const { payload } = await jwtVerify(token, this.#jwks, {
        issuer: this.#issuer,
        audience: this.#audience,
      });

      if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        throw new ResolveSessionError(
          "AUTH_INVALID_TOKEN",
          "The token does not include a valid subject claim.",
          401,
        );
      }

      if (typeof payload.exp !== "number") {
        throw new ResolveSessionError(
          "AUTH_INVALID_TOKEN",
          "The token does not include a valid expiration claim.",
          401,
        );
      }

      return {
        subject: payload.sub,
        email: typeof payload.email === "string" ? payload.email : null,
        expires_at: payload.exp,
      };
    } catch (error) {
      if (error instanceof ResolveSessionError) {
        throw error;
      }

      if (error instanceof Error && error.name === "JWTExpired") {
        throw new ResolveSessionError(
          "AUTH_TOKEN_EXPIRED",
          "The supplied token has expired.",
          401,
        );
      }

       if (error instanceof Error && error.name === "JWKSNoMatchingKey") {
        throw new ResolveSessionError(
          "AUTH_INVALID_TOKEN",
          "The supplied token could not be verified.",
          401,
        );
      }

      if (error instanceof Error && isRemoteJwksUnavailableError(error)) {
        throw new ResolveSessionError(
          "AUTH_JWKS_UNAVAILABLE",
          "Token verification is temporarily unavailable because the JWKS source could not be reached.",
          503,
        );
      }

      if (error instanceof Error && isTokenVerificationUnavailableError(error)) {
        throw new ResolveSessionError(
          "AUTH_TOKEN_VERIFICATION_UNAVAILABLE",
          "Token verification is temporarily unavailable.",
          503,
        );
      }

      throw new ResolveSessionError(
        "AUTH_INVALID_TOKEN",
        "The supplied token could not be verified.",
        401,
      );
    }
  }
}

const isRemoteJwksUnavailableError = (error: Error): boolean => {
  const message = error.message.toLowerCase();

  return (error.name === "JOSEError" || error.name === "TypeError")
    && (
      message.includes("jwks")
      || message.includes("fetch")
      || message.includes("econnrefused")
      || message.includes("enotfound")
      || message.includes("connect")
    );
};

const isTokenVerificationUnavailableError = (error: Error): boolean => {
  const message = error.message.toLowerCase();

  return error.name === "TimeoutError"
    || message.includes("timeout")
    || message.includes("network")
    || message.includes("socket")
    || message.includes("econnrefused")
    || message.includes("enotfound");
};