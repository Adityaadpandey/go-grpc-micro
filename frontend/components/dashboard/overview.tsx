"use client";

import { useQuery } from "@apollo/client/react";
import {
  Users,
  ShoppingBag,
  ClipboardList,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GET_ACCOUNTS, GET_PRODUCTS } from "@/lib/graphql/queries";
import type { Account, Product } from "@/types/graphql";
import { formatCurrency } from "@/lib/utils";

interface AccountsData { accounts: Account[] }
interface ProductsData { products: Product[] }

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  loading?: boolean;
}

function StatCard({ title, value, description, icon, loading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardOverview() {
  const { data: accountsData, loading: accountsLoading } =
    useQuery<AccountsData>(GET_ACCOUNTS, {
      variables: { skip: 0, take: 100 },
    });

  const { data: productsData, loading: productsLoading } =
    useQuery<ProductsData>(GET_PRODUCTS, {
      variables: { skip: 0, take: 100 },
    });

  const accounts = accountsData?.accounts ?? [];
  const products = productsData?.products ?? [];

  const totalOrders = accounts.reduce((sum, a) => sum + a.orders.length, 0);
  const totalRevenue = accounts.reduce(
    (sum, a) => sum + a.orders.reduce((s, o) => s + o.totalPrice, 0),
    0
  );

  const isLoading = accountsLoading || productsLoading;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Accounts"
          value={accounts.length}
          description="Registered users"
          icon={<Users className="h-4 w-4" />}
          loading={accountsLoading}
        />
        <StatCard
          title="Products"
          value={products.length}
          description="In the catalog"
          icon={<ShoppingBag className="h-4 w-4" />}
          loading={productsLoading}
        />
        <StatCard
          title="Total Orders"
          value={totalOrders}
          description="Across all accounts"
          icon={<ClipboardList className="h-4 w-4" />}
          loading={accountsLoading}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          description="All time"
          icon={<TrendingUp className="h-4 w-4" />}
          loading={accountsLoading}
        />
      </div>

      {/* Recent accounts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No accounts yet.</p>
            ) : (
              <ul className="space-y-2">
                {accounts.slice(0, 6).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{a.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {a.orders.length} order{a.orders.length !== 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catalog Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products yet.</p>
            ) : (
              <ul className="space-y-2">
                {products.slice(0, 6).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span className="font-medium truncate max-w-[65%]">
                      {p.name}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      ${p.price.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading data…</span>
        </div>
      )}
    </div>
  );
}
