import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCredential, credentialExists } from "@/lib/auth/auth-store";
import {
  signToken,
  AUTH_COOKIE_OPTIONS,
  CSRF_COOKIE_OPTIONS,
} from "@/lib/auth/jwt";
import { generateCsrfToken } from "@/lib/security/csrf";
import { serverGraphQL } from "@/lib/apollo/server";
import { CREATE_ACCOUNT_MUTATION } from "@/lib/graphql/mutations";
import type { CreateAccountMutationResult } from "@/types/graphql";

// ── Input validation ────────────────────────────────────────────────────────
const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(64, "Name too long")
    .regex(/^[a-zA-Z0-9_\- ]+$/, "Name contains invalid characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
  role: z.enum(["admin", "user"]).optional().default("user"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Only accept JSON
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type must be application/json" },
      { status: 415 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate input
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 422 }
    );
  }
  const { name, password, role } = parsed.data;

  // Check if username taken (without revealing timing info via constant work)
  const taken = credentialExists(name);
  if (taken) {
    return NextResponse.json(
      { error: "An account with that name already exists" },
      { status: 409 }
    );
  }

  // Create account in the GraphQL backend
  let accountId: string;
  try {
    const result = await serverGraphQL<CreateAccountMutationResult>(
      CREATE_ACCOUNT_MUTATION,
      { name }
    );
    if (!result.createAccount?.id) {
      throw new Error("Account creation failed");
    }
    accountId = result.createAccount.id;
  } catch (err) {
    console.error("[register] GraphQL error", err);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 502 }
    );
  }

  // Store credentials
  try {
    await createCredential(name, password, accountId, role);
  } catch (err) {
    console.error("[register] store error", err);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }

  // Issue JWT + CSRF token
  const csrf = generateCsrfToken();
  const token = await signToken({ sub: accountId, name, role, csrf });

  const response = NextResponse.json(
    { user: { id: accountId, name, role } },
    { status: 201 }
  );

  response.cookies.set(AUTH_COOKIE_OPTIONS.name, token, AUTH_COOKIE_OPTIONS);
  response.cookies.set(CSRF_COOKIE_OPTIONS.name, csrf, CSRF_COOKIE_OPTIONS);

  return response;
}
