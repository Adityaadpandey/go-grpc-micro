import {
    AUTH_COOKIE_OPTIONS,
    CSRF_COOKIE_OPTIONS,
    signToken,
} from "@/lib/auth/jwt";
import { generateCsrfToken } from "@/lib/security/csrf";
import type { AuthStore } from "@/types/auth";
import { existsSync, readFileSync } from "fs";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";

// Temporary helper to get user info from ID (simulates DB lookup)
// In production, this should hit a proper database or Redis store.
function getUserRoleAndName(accountId: string): { name: string; role: import("@/types/auth").Role } | null {
    const STORE_PATH =
        process.env.AUTH_STORE_PATH ??
        join(process.cwd(), "data", "auth.json");

    try {
        if (!existsSync(STORE_PATH)) return null;
        const raw = readFileSync(STORE_PATH, "utf-8");
        const store = JSON.parse(raw) as AuthStore;
        for (const key of Object.keys(store)) {
            if (store[key].accountId === accountId) {
                return { name: store[key].name, role: store[key].role };
            }
        }
    } catch {
        return null;
    }
    return null;
}

function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) return new TextEncoder().encode("dev-secret-do-not-use-in-production-at-all-32chars");
    return new TextEncoder().encode(secret);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const refreshToken = request.cookies.get("refresh-token")?.value;

    if (!refreshToken) {
        return NextResponse.json({ error: "Refresh token missing" }, { status: 401 });
    }

    try {
        // 1. Verify the long-lived refresh token
        const { payload } = await jwtVerify(refreshToken, getJwtSecret());

        if (payload.type !== "refresh" || typeof payload.sub !== "string") {
            throw new Error("Invalid token type");
        }

        // 2. Lookup user info to embed in new access token
        const userInfo = getUserRoleAndName(payload.sub);
        if (!userInfo) {
            throw new Error("User no longer exists");
        }

        // 3. Issue new short-lived access token + new CSRF token
        const csrf = generateCsrfToken();
        const newAccessToken = await signToken({
            sub: payload.sub,
            name: userInfo.name,
            role: userInfo.role,
            csrf,
        });

        const response = NextResponse.json({ success: true });

        // 4. Set the new cookies
        response.cookies.set(AUTH_COOKIE_OPTIONS.name, newAccessToken, AUTH_COOKIE_OPTIONS);
        response.cookies.set(CSRF_COOKIE_OPTIONS.name, csrf, CSRF_COOKIE_OPTIONS);

        return response;
    } catch (err) {
        // Invalid or expired refresh token -> User must re-authenticate
        const response = NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
        response.cookies.delete("refresh-token");
        response.cookies.delete("auth-token");
        response.cookies.delete("csrf-token");
        return response;
    }
}
