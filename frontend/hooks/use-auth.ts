"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import type { AuthUser } from "@/types/auth";

/** Hydrate auth state from /api/auth/me on mount. */
export function useAuth() {
  const { user, isLoading, setUser, setLoading, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (!cancelled) {
          if (res.ok) {
            const data = (await res.json()) as { user: AuthUser };
            setUser(data.user);
          } else {
            setUser(null);
          }
        }
      } catch {
        if (!cancelled) setUser(null);
      }
    }
    void fetchMe();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  const signOut = async () => {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    logout();
    router.push("/login");
  };

  return { user, isLoading, signOut };
}
