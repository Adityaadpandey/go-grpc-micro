"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Search, ShoppingBag, Loader2, AlertCircle } from "lucide-react";
import { GET_PRODUCTS } from "@/lib/graphql/queries";
import type { Product } from "@/types/graphql";
import { ProductCard } from "./product-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProductsQueryData {
  products: Product[];
}

export function ProductsGrid() {
  const [search, setSearch] = useState("");

  const { data, loading, error } = useQuery<ProductsQueryData>(GET_PRODUCTS, {
    variables: { skip: 0, take: 50, query: search || undefined },
    fetchPolicy: "cache-and-network",
  });

  const products = data?.products ?? [];

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load products.</AlertDescription>
        </Alert>
      )}

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No products found</p>
            <p className="text-sm text-muted-foreground">
              {search ? "Try a different search term." : "Add a product to get started."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {loading && data && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
