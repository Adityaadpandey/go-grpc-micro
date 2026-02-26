import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/types/graphql";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: () => number;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const existing = get().items.find((i) => i.product.id === product.id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.product.id === product.id
                ? { ...i, quantity: Math.min(i.quantity + 1, 999) }
                : i
            ),
          });
        } else {
          set({ items: [...get().items, { product, quantity: 1 }] });
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.product.id !== productId) }),
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.product.id !== productId) });
        } else {
          set({
            items: get().items.map((i) =>
              i.product.id === productId
                ? { ...i, quantity: Math.min(quantity, 999) }
                : i
            ),
          });
        }
      },
      clearCart: () => set({ items: [] }),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      total: () =>
        get().items.reduce(
          (sum, i) => sum + i.product.price * i.quantity,
          0
        ),
    }),
    { name: "micromart-cart" }
  )
);
