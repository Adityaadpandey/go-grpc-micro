"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { ClipboardList } from "lucide-react";
import { TopNav } from "@/components/layout/top-nav";
import { OrdersTable } from "@/components/orders/orders-table";
import { GET_ACCOUNTS } from "@/lib/graphql/queries";
import { useAuthStore } from "@/store/auth-store";
import type { Account } from "@/types/graphql";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface AccountsData {
  accounts: Account[];
}

export default function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  // Admins can switch between accounts; regular users only see their own.
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const isAdmin = user?.role === "admin";

  // Admins fetch all accounts for the selector.
  const { data, loading } = useQuery<AccountsData>(GET_ACCOUNTS, {
    variables: { skip: 0, take: 100 },
    skip: !isAdmin,
  });

  // Regular users always see their own account; admins pick one.
  const accountId = isAdmin ? selectedAccountId : (user?.id ?? "");

  return (
    <div className="flex flex-col h-full">
      <TopNav title="Orders" description="Your order history" />
      <div className="flex-1 p-6 space-y-4">

        {/* Admin-only: account switcher */}
        {isAdmin && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Account:</span>
            {loading ? (
              <Skeleton className="h-9 w-48" />
            ) : (
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select an account…" />
                </SelectTrigger>
                <SelectContent>
                  {(data?.accounts ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {accountId ? (
          <OrdersTable accountId={accountId} />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center gap-4">
            <ClipboardList className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No account selected</p>
              <p className="text-sm text-muted-foreground mt-1">
                Select an account above to view its orders.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
