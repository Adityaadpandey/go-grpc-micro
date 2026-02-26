/**
 * Server-side session helpers.
 * Read the current user from request headers (injected by middleware).
 */
import { cookies, headers } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import type { AuthUser } from "@/types/auth";

/** Get the current user from middleware-injected headers (server components). */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const headerStore = await headers();
  const id = headerStore.get("x-user-id");
  const name = headerStore.get("x-user-name");
  const role = headerStore.get("x-user-role") as AuthUser["role"] | null;

  if (!id || !name || !role) return null;
  return { id, name, role };
}

/** Get the current user by verifying the JWT cookie (API routes). */
export async function getUserFromCookie(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    name: payload.name,
    role: payload.role,
  };
}
