"use client";

import Link from "next/link";
import { Moon, Sun, LayoutDashboard, Store } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { CartSheet } from "@/components/cart/cart-sheet";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

export function StoreNav() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Store className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">MicroMart Store</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Back to dashboard */}
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex gap-1.5">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>

          {/* User chip */}
          {user && (
            <Badge variant="secondary" className="hidden sm:flex text-xs font-medium">
              {user.name}
            </Badge>
          )}

          {/* Cart */}
          <CartSheet />

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
    </header>
  );
}
