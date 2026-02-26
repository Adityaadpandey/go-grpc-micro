import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/health",
];

// Admin-only paths
const ADMIN_PATHS = ["/dashboard/accounts"];

function getSecret(): Uint8Array {
  const s =
    process.env.JWT_SECRET ??
    "dev-secret-do-not-use-in-production-at-all-32chars";
  return new TextEncoder().encode(s);
}

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAdminOnly(pathname: string): boolean {
  return ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Generate a random nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Build Strict CSP directives
  const cspDirectives = [
    "default-src 'self'",
    process.env.NODE_ENV === "development"
      ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://checkout.razorpay.com` // Next.js dev requires unsafe-eval
      : `script-src 'self' 'nonce-${nonce}' https://checkout.razorpay.com`,
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline (or extensive config)
    "img-src 'self' data: blob: https://checkout.razorpay.com",
    "font-src 'self'",
    "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
    "frame-src https://api.razorpay.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(request.headers.get("x-forwarded-proto") === "https"
      ? ["upgrade-insecure-requests"]
      : []),
  ].join("; ");

  // Helper to inject our headers into any NextResponse
  const applyHeaders = (response: NextResponse, reqHeaders?: Headers) => {
    response.headers.set("Content-Security-Policy", cspDirectives);
    if (reqHeaders) {
      reqHeaders.set("x-nonce", nonce);
    }
    return response;
  };

  const baseHeaders = new Headers(request.headers);
  baseHeaders.set("x-nonce", nonce);

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons/") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico")
  ) {
    return applyHeaders(NextResponse.next({ request: { headers: baseHeaders } }), baseHeaders);
  }

  // Public routes – no auth needed
  if (isPublic(pathname)) {
    // Redirect already-authenticated users away from auth pages
    if (pathname === "/login" || pathname === "/register") {
      const token = request.cookies.get("auth-token")?.value;
      if (token) {
        try {
          await jwtVerify(token, getSecret());
          return applyHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
        } catch {
          // Invalid token – continue to login page
        }
      }
    }
    return applyHeaders(NextResponse.next({ request: { headers: baseHeaders } }), baseHeaders);
  }

  // Protected routes – validate JWT
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return applyHeaders(NextResponse.redirect(loginUrl));
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());

    // RBAC check for admin routes
    if (isAdminOnly(pathname) && payload.role !== "admin") {
      return applyHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
    }

    // Inject user info into request headers for server components
    baseHeaders.set("x-user-id", String(payload.sub ?? ""));
    baseHeaders.set("x-user-name", String(payload.name ?? ""));
    baseHeaders.set("x-user-role", String(payload.role ?? "user"));

    return applyHeaders(NextResponse.next({ request: { headers: baseHeaders } }), baseHeaders);
  } catch {
    // Token expired or invalid – clear it and redirect
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("auth-token");
    response.cookies.delete("csrf-token");
    return applyHeaders(response);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
