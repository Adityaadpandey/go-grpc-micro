"use client";

import { ShoppingBag } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/types/graphql";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{product.name}</CardTitle>
          <Badge variant="outline" className="shrink-0 font-mono text-xs">
            ${product.price.toFixed(2)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {product.description}
        </p>
      </CardContent>
      <CardFooter className="pt-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ShoppingBag className="h-3 w-3" />
          <span className="font-mono">{product.id.slice(0, 8)}…</span>
        </div>
      </CardFooter>
    </Card>
  );
}
