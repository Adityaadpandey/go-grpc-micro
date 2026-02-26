import type { Metadata } from "next";
import { TopNav } from "@/components/layout/top-nav";
import { ProductsGrid } from "@/components/products/products-grid";
import { CreateProductDialog } from "@/components/products/create-product-dialog";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <div className="flex flex-col h-full">
      <TopNav
        title="Products"
        description="Browse and manage the product catalog"
      />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Search and filter the full catalog
          </p>
          <CreateProductDialog />
        </div>
        <ProductsGrid />
      </div>
    </div>
  );
}
