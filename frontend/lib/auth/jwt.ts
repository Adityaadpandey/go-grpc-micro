/**
 * JWT utilities – Edge runtime compatible (uses jose).
 * All token operations are server-side only.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { randomUUID } from "crypto";
import type { Role, SessionPayload } from "@/types/auth";

/** Token lifespan: 7 days */
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Cookie configuration for the auth token */
export const AUTH_COOKIE_OPTIONS = {
  name: "auth-token",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: TOKEN_TTL_SECONDS,
};

/** Cookie for CSRF double-submit pattern (NOT httpOnly so JS can read it) */
export const CSRF_COOKIE_OPTIONS = {
  name: "csrf-token",
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: TOKEN_TTL_SECONDS,
};

/** Lazy-evaluated JWT secret to avoid module-load errors during build */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is required in production");
    }
    return new TextEncoder().encode("dev-secret-do-not-use-in-production-at-all-32chars");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: {
  sub: string;
  name: string;
  role: Role;
  csrf: string;
}): Promise<string> {
  return new SignJWT({
    name: payload.name,
    role: payload.role,
    csrf: payload.csrf,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifyToken(
  token: string
): Promise<(SessionPayload & JWTPayload) | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as SessionPayload & JWTPayload;
  } catch {
    return null;
  }
}
