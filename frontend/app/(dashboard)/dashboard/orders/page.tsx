"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { TopNav } from "@/components/layout/top-nav";
import { OrdersTable } from "@/components/orders/orders-table";
import { CreateOrderDialog } from "@/components/orders/create-order-dialog";
import { GET_ACCOUNTS } from "@/lib/graphql/queries";
import type { Account } from "@/types/graphql";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface AccountsData { accounts: Account[] }

export default function OrdersPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const { data, loading } = useQuery<AccountsData>(GET_ACCOUNTS, {
    variables: { skip: 0, take: 100 },
  });

  const accounts = data?.accounts ?? [];

  return (
    <div className="flex flex-col h-full">
      <TopNav title="Orders" description="View and create orders" />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Account selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Account:</span>
            {loading ? (
              <Skeleton className="h-9 w-48" />
            ) : (
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select an account…" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <CreateOrderDialog />
        </div>

        {selectedAccountId ? (
          <OrdersTable accountId={selectedAccountId} />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <p className="text-muted-foreground text-sm">
              Select an account above to view its orders.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
