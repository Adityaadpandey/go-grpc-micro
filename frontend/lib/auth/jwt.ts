/**
 * JWT utilities – Edge runtime compatible (uses jose).
 * All token operations are server-side only.
 */
import type { Role, SessionPayload } from "@/types/auth";
import { randomUUID } from "crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/** Access token lifespan: 15 minutes */
const ACCESS_TOKEN_TTL = 15 * 60;

/** Refresh token lifespan: 7 days */
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;

/** Set SECURE_COOKIES=true only when serving over HTTPS */
const useSecureCookies = process.env.SECURE_COOKIES === "true";

/** Cookie configuration for the short-lived access token */
export const AUTH_COOKIE_OPTIONS = {
  name: "auth-token",
  httpOnly: true,
  secure: useSecureCookies,
  sameSite: "strict" as const,
  path: "/",
  maxAge: ACCESS_TOKEN_TTL,
};

/** Cookie configuration for the long-lived refresh token */
export const REFRESH_COOKIE_OPTIONS = {
  name: "refresh-token",
  httpOnly: true,
  secure: useSecureCookies,
  sameSite: "strict" as const,
  path: "/api/auth/refresh", // Only sent to the refresh endpoint
  maxAge: REFRESH_TOKEN_TTL,
};

/** Cookie for CSRF double-submit pattern (NOT httpOnly so JS can read it) */
export const CSRF_COOKIE_OPTIONS = {
  name: "csrf-token",
  httpOnly: false,
  secure: useSecureCookies,
  sameSite: "strict" as const,
  path: "/",
  maxAge: ACCESS_TOKEN_TTL, // Tied to access token lifetime
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
    .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .sign(getJwtSecret());
}

export async function signRefreshToken(sub: string): Promise<string> {
  return new SignJWT({ type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL}s`)
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
