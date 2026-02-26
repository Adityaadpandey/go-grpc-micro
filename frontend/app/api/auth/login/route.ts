import { verifyCredential } from "@/lib/auth/auth-store";
import {
  AUTH_COOKIE_OPTIONS,
  CSRF_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
  signRefreshToken,
  signToken,
} from "@/lib/auth/jwt";
import { generateCsrfToken } from "@/lib/security/csrf";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ── Rate Limiter ────────────────────────────────────────────────────────────
// Allow 10 login attempts per 5 minutes per IP
const loginRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const LOGIN_RATE_LIMIT_WINDOW = 60_000 * 5; // 5 mins
const LOGIN_RATE_LIMIT_MAX = 10;

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginRateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    loginRateLimitMap.set(ip, { count: 1, resetAt: now + LOGIN_RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= LOGIN_RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of loginRateLimitMap.entries()) {
    if (now > val.resetAt) loginRateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

const LoginSchema = z.object({
  name: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});

// Generic error message – never reveal whether the name or password was wrong
const INVALID_CREDS_MSG = "Invalid credentials";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") || "unknown";

  if (!checkLoginRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(LOGIN_RATE_LIMIT_WINDOW / 1000) } }
    );
  }

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
  const refreshToken = await signRefreshToken(entry.accountId);

  const response = NextResponse.json({
    user: { id: entry.accountId, name: entry.name, role: entry.role },
  });

  response.cookies.set(AUTH_COOKIE_OPTIONS.name, token, AUTH_COOKIE_OPTIONS);
  response.cookies.set(CSRF_COOKIE_OPTIONS.name, csrf, CSRF_COOKIE_OPTIONS);
  response.cookies.set(REFRESH_COOKIE_OPTIONS.name, refreshToken, REFRESH_COOKIE_OPTIONS);

  return response;
}
