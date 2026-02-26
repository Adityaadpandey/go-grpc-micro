"use client";

import { useQuery } from "@apollo/client/react";
import { ClipboardList, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { GET_ACCOUNT_BY_ID } from "@/lib/graphql/queries";
import type { Account, Order } from "@/types/graphql";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";

interface AccountQueryData {
  accounts: Account[];
}

interface OrdersTableProps {
  accountId: string;
}

function OrderRow({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <>
        <TableRow className="cursor-pointer hover:bg-muted/50">
          <CollapsibleTrigger asChild>
            <TableCell className="w-8">
              {open ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </TableCell>
          </CollapsibleTrigger>
          <TableCell className="font-mono text-xs text-muted-foreground">
            {order.id.slice(0, 12)}…
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(order.createdAt))}
          </TableCell>
          <TableCell className="text-center">
            <Badge variant="secondary">{order.products.length}</Badge>
          </TableCell>
          <TableCell className="text-right font-semibold">
            ${order.totalPrice.toFixed(2)}
          </TableCell>
        </TableRow>
        <CollapsibleContent asChild>
          <TableRow>
            <TableCell colSpan={5} className="p-0">
              <div className="bg-muted/30 px-8 py-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="text-left font-medium pb-1">Product</th>
                      <th className="text-center font-medium pb-1">Qty</th>
                      <th className="text-right font-medium pb-1">Unit</th>
                      <th className="text-right font-medium pb-1">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.products.map((p) => (
                      <tr key={p.id}>
                        <td className="py-0.5">{p.name}</td>
                        <td className="text-center text-muted-foreground">
                          {p.quantity}
                        </td>
                        <td className="text-right text-muted-foreground">
                          ${p.price.toFixed(2)}
                        </td>
                        <td className="text-right font-medium">
                          ${(p.price * p.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      </>
    </Collapsible>
  );
}

export function OrdersTable({ accountId }: OrdersTableProps) {
  const { data, loading, error, refetch } = useQuery<AccountQueryData>(
    GET_ACCOUNT_BY_ID,
    {
      variables: { id: accountId },
      fetchPolicy: "cache-and-network",
    }
  );

  if (loading && !data) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
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
          <span>Failed to load orders.</span>
          <Button variant="outline" size="sm" onClick={() => void refetch()} className="gap-2">
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const orders: Order[] = data?.accounts?.[0]?.orders ?? [];
  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">No orders yet</p>
          <p className="text-sm text-muted-foreground">Place an order to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Order ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-center">Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
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
