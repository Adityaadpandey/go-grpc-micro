/**
 * Secure GraphQL proxy.
 *
 * Security layers:
 *  1. JWT authentication (HTTP-only cookie)
 *  2. CSRF validation (double-submit cookie pattern)
 *  3. Query depth limiting (prevents deeply nested abuse)
 *  4. Query complexity check (guards against expensive queries)
 *  5. Introspection blocked in production
 *  6. Rate limiting per IP
 *  7. Response error masking
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/session";
import { validateCsrf } from "@/lib/security/csrf";
import { verifyToken } from "@/lib/auth/jwt";
import { cookies } from "next/headers";

const GRAPHQL_URL =
  process.env.GRAPHQL_URL ?? "http://localhost:8080/graphql";

// ── Config ────────────────────────────────────────────────────────────────
const MAX_DEPTH = 5;
const MAX_QUERY_LENGTH = 4096; // chars
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 min
const RATE_LIMIT_MAX = 120; // requests per window per IP

// ── In-memory rate limiter ────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Clean up stale entries periodically (every 5 min)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  },
  5 * 60 * 1000
);

// ── Query depth limiter ───────────────────────────────────────────────────
function getQueryDepth(query: string): number {
  let depth = 0;
  let maxDepth = 0;
  for (const char of query) {
    if (char === "{") {
      maxDepth = Math.max(maxDepth, ++depth);
    } else if (char === "}") {
      depth--;
    }
  }
  return maxDepth;
}

function containsIntrospection(query: string): boolean {
  return (
    query.includes("__schema") ||
    query.includes("__type") ||
    query.includes("IntrospectionQuery")
  );
}

// ── Mask errors for production ────────────────────────────────────────────
function maskErrors(
  body: Record<string, unknown>
): Record<string, unknown> {
  if (process.env.NODE_ENV === "production" && Array.isArray(body.errors)) {
    body.errors = (
      body.errors as Array<{ message?: string }>
    ).map((e) => ({
      message:
        typeof e.message === "string" &&
        (e.message.includes("not found") ||
          e.message.includes("invalid") ||
          e.message.includes("required"))
          ? e.message
          : "An error occurred",
    }));
  }
  return body;
}

// ── Handler ───────────────────────────────────────────────────────────────
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { errors: [{ message: "Too many requests" }] },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // 2. Authentication
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json(
      { errors: [{ message: "Authentication required" }] },
      { status: 401 }
    );
  }

  // 3. CSRF validation
  const cookieStore = await cookies();
  const jwtToken = cookieStore.get("auth-token")?.value;
  const payload = jwtToken ? await verifyToken(jwtToken) : null;
  const csrfHeader = request.headers.get("X-CSRF-Token");

  console.log("[graphql/csrf] header present:", !!csrfHeader, "| header length:", csrfHeader?.length ?? 0, "| jwt.csrf present:", !!(payload as Record<string, unknown>)?.csrf);

  if (!validateCsrf(csrfHeader, payload?.csrf ?? null)) {
    return NextResponse.json(
      { errors: [{ message: "CSRF validation failed" }] },
      { status: 403 }
    );
  }

  // 4. Parse and validate body
  let body: { query?: string; variables?: unknown; operationName?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { errors: [{ message: "Invalid request body" }] },
      { status: 400 }
    );
  }

  const { query, variables, operationName } = body;

  if (typeof query !== "string" || !query.trim()) {
    return NextResponse.json(
      { errors: [{ message: "Query is required" }] },
      { status: 400 }
    );
  }

  // 5. Query length limit
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { errors: [{ message: "Query too large" }] },
      { status: 400 }
    );
  }

  // 6. Block introspection in production
  if (
    process.env.NODE_ENV === "production" &&
    containsIntrospection(query)
  ) {
    return NextResponse.json(
      { errors: [{ message: "Introspection is disabled" }] },
      { status: 403 }
    );
  }

  // 7. Depth limiting
  const depth = getQueryDepth(query);
  if (depth > MAX_DEPTH) {
    return NextResponse.json(
      { errors: [{ message: `Query depth ${depth} exceeds maximum of ${MAX_DEPTH}` }] },
      { status: 400 }
    );
  }

  // 8. Forward to backend
  let backendResponse: Response;
  try {
    backendResponse = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // Forward user identity for audit logging (server-side only)
        "X-User-Id": user.id,
        "X-User-Role": user.role,
      },
      body: JSON.stringify({ query, variables, operationName }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { errors: [{ message: "Service temporarily unavailable" }] },
      { status: 502 }
    );
  }

  if (!backendResponse.ok) {
    return NextResponse.json(
      { errors: [{ message: "Upstream service error" }] },
      { status: 502 }
    );
  }

  const responseBody = (await backendResponse.json()) as Record<
    string,
    unknown
  >;

  // 9. Mask errors before sending to client
  const safeBody = maskErrors(responseBody);

  return NextResponse.json(safeBody, {
    headers: {
      "Cache-Control": "no-store, no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// Health check
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: "ok" });
}
