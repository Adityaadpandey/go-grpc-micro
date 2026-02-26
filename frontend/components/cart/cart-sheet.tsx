"use client";

import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Loader2,
  PackageOpen,
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";

/** Dynamically load the Razorpay checkout script (only once). */
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

export function CartSheet() {
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  const user = useAuthStore((s) => s.user);
  const { items, removeItem, updateQuantity, clearCart, itemCount, total } =
    useCartStore();

  const count = itemCount();

  const handleCheckout = useCallback(async () => {
    if (!user?.id) {
      toast.error("You must be logged in to place an order.");
      return;
    }
    if (items.length === 0) return;

    setPaying(true);
    try {
      // ── Step 1: Create a Razorpay order on the server ──────────────────────
      const createRes = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ amount: total() }),
      });

      if (!createRes.ok) {
        const err = (await createRes.json()) as { error?: string };
        throw new Error(err.error ?? "Failed to initiate payment");
      }

      const { razorpayOrderId, amount, currency, keyId } =
        (await createRes.json()) as {
          razorpayOrderId: string;
          amount: number;
          currency: string;
          keyId: string;
        };

      // ── Step 2: Load Razorpay script and open modal ─────────────────────────
      await loadRazorpayScript();

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: keyId,
          amount,
          currency,
          name: "MicroMart",
          description: `${count} item${count !== 1 ? "s" : ""}`,
          order_id: razorpayOrderId,
          prefill: { name: user.name },
          theme: { color: "hsl(var(--primary))" },

          handler: async (response) => {
            // ── Step 3: Verify signature + create order on server ─────────────
            try {
              const verifyRes = await fetch(
                "/api/payments/razorpay/verify",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "same-origin",
                  body: JSON.stringify({
                    razorpayOrderId: response.razorpay_order_id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpaySignature: response.razorpay_signature,
                    products: items.map((i) => ({
                      id: i.product.id,
                      quantity: i.quantity,
                    })),
                  }),
                }
              );

              if (!verifyRes.ok) {
                const err = (await verifyRes.json()) as { error?: string };
                throw new Error(err.error ?? "Payment verification failed");
              }

              const { order } = (await verifyRes.json()) as {
                order: { totalPrice: number };
              };

              toast.success(
                `Order placed! Total ₹${order.totalPrice.toFixed(2)}`
              );
              clearCart();
              setOpen(false);
              resolve();
            } catch (err) {
              reject(err);
            }
          },

          modal: {
            ondismiss: () => reject(new Error("cancelled")),
          },
        });

        rzp.open();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg !== "cancelled") toast.error(msg);
    } finally {
      setPaying(false);
    }
  }, [user, items, total, count, clearCart]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Open cart"
        >
          <ShoppingCart className="h-5 w-5" />
          {count > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-bold">
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="px-4 py-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your Cart
            {count > 0 && (
              <Badge variant="secondary" className="ml-1">
                {count} {count === 1 ? "item" : "items"}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-4">
            <PackageOpen className="h-12 w-12 text-muted-foreground" />
            <p className="font-medium">Your cart is empty</p>
            <p className="text-sm text-muted-foreground">
              Browse products and add them to your cart.
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="space-y-3 p-4">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ₹{product.price.toFixed(2)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          updateQuantity(product.id, quantity - 1)
                        }
                        disabled={paying}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm tabular-nums">
                        {quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          updateQuantity(product.id, quantity + 1)
                        }
                        disabled={paying || quantity >= 999}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <p className="text-sm font-semibold w-16 text-right shrink-0">
                      ₹{(product.price * quantity).toFixed(2)}
                    </p>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(product.id)}
                      disabled={paying}
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t bg-background p-4 space-y-3 shrink-0">
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span className="text-lg">₹{total().toFixed(2)}</span>
              </div>

              <Separator />

              {user && (
                <p className="text-xs text-muted-foreground">
                  Ordering as{" "}
                  <span className="font-medium text-foreground">
                    {user.name}
                  </span>
                </p>
              )}

              <Button
                className="w-full"
                onClick={() => void handleCheckout()}
                disabled={paying || items.length === 0 || !user}
              >
                {paying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>Pay ₹{total().toFixed(2)}</>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={clearCart}
                disabled={paying}
              >
                Clear cart
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
