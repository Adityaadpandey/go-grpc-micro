import { ProductsGrid } from "@/components/products/products-grid";

export default function StorePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      {/* Hero */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Browse Products</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Find what you need and add it to your cart.
        </p>
      </div>

      {/* Product grid — search + Add to Cart already built in */}
      <ProductsGrid />
    </div>
  );
}
