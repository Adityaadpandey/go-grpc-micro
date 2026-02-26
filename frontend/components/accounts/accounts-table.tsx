"use client";

import { useQuery } from "@apollo/client/react";
import { Users, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { GET_ACCOUNTS } from "@/lib/graphql/queries";
import type { Account } from "@/types/graphql";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AccountsQueryData {
  accounts: Account[];
}

export function AccountsTable() {
  const { data, loading, error, refetch } = useQuery<AccountsQueryData>(
    GET_ACCOUNTS,
    {
      variables: { skip: 0, take: 50 },
      fetchPolicy: "cache-and-network",
    }
  );

  if (loading && !data) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Failed to load accounts.</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const accounts = data?.accounts ?? [];

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <Users className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium text-foreground">No accounts yet</p>
          <p className="text-sm text-muted-foreground">
            Create an account to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-center">Orders</TableHead>
            <TableHead className="text-right">Total Spend</TableHead>
            <TableHead className="text-right">Last Order</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => {
            const totalSpend = account.orders.reduce(
              (sum, o) => sum + o.totalPrice,
              0
            );
            const lastOrder =
              account.orders.length > 0
                ? account.orders.sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                  )[0]
                : null;
            return (
              <TableRow key={account.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {account.id.slice(0, 12)}…
                </TableCell>
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{account.orders.length}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {totalSpend > 0
                    ? `$${totalSpend.toFixed(2)}`
                    : "—"}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {lastOrder
                    ? formatDistanceToNow(new Date(lastOrder.createdAt))
                    : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {loading && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
