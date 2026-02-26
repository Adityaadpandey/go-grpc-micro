import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyCredential } from "@/lib/auth/auth-store";
import {
  signToken,
  AUTH_COOKIE_OPTIONS,
  CSRF_COOKIE_OPTIONS,
} from "@/lib/auth/jwt";
import { generateCsrfToken } from "@/lib/security/csrf";

const LoginSchema = z.object({
  name: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});

// Generic error message – never reveal whether the name or password was wrong
const INVALID_CREDS_MSG = "Invalid credentials";

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: INVALID_CREDS_MSG }, { status: 401 });
  }
  const { name, password } = parsed.data;

  const entry = await verifyCredential(name, password);
  if (!entry) {
    // Constant-time response to prevent enumeration
    await new Promise((r) => setTimeout(r, 200));
    return NextResponse.json({ error: INVALID_CREDS_MSG }, { status: 401 });
  }

  const csrf = generateCsrfToken();
  const token = await signToken({
    sub: entry.accountId,
    name: entry.name,
    role: entry.role,
    csrf,
  });

  const response = NextResponse.json({
    user: { id: entry.accountId, name: entry.name, role: entry.role },
  });

  response.cookies.set(AUTH_COOKIE_OPTIONS.name, token, AUTH_COOKIE_OPTIONS);
  response.cookies.set(CSRF_COOKIE_OPTIONS.name, csrf, CSRF_COOKIE_OPTIONS);

  return response;
}
