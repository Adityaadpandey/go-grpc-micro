import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

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

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons/") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // Public routes – no auth needed
  if (isPublic(pathname)) {
    // Redirect already-authenticated users away from auth pages
    if (pathname === "/login" || pathname === "/register") {
      const token = request.cookies.get("auth-token")?.value;
      if (token) {
        try {
          await jwtVerify(token, getSecret());
          return NextResponse.redirect(new URL("/dashboard", request.url));
        } catch {
          // Invalid token – continue to login page
        }
      }
    }
    return NextResponse.next();
  }

  // Protected routes – validate JWT
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());

    // RBAC check for admin routes
    if (isAdminOnly(pathname) && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Inject user info into request headers for server components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", String(payload.sub ?? ""));
    requestHeaders.set("x-user-name", String(payload.name ?? ""));
    requestHeaders.set("x-user-role", String(payload.role ?? "user"));

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    // Token expired or invalid – clear it and redirect
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("auth-token");
    response.cookies.delete("csrf-token");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
