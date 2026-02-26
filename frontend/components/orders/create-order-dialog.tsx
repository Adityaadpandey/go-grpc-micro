"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@apollo/client/react";
import { Plus, Trash2, Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CREATE_ORDER } from "@/lib/graphql/mutations";
import { GET_ACCOUNTS, GET_PRODUCTS } from "@/lib/graphql/queries";
import type { Account, Product, CreateOrderMutationResult } from "@/types/graphql";
import { ScrollArea } from "../ui/scroll-area";

const schema = z.object({
  accountId: z.string().min(1, "Select an account"),
  products: z
    .array(
      z.object({
        id: z.string().min(1, "Select a product"),
        quantity: z
          .string()
          .regex(/^\d+$/, "Must be a positive integer")
          .refine((v) => parseInt(v) > 0, "Must be at least 1")
          .refine((v) => parseInt(v) <= 999, "Max quantity 999"),
      })
    )
    .min(1, "Add at least one product"),
});

type FormValues = z.infer<typeof schema>;

interface AccountsData { accounts: Account[] }
interface ProductsData { products: Product[] }

export function CreateOrderDialog() {
  const [open, setOpen] = useState(false);

  const { data: accountsData } = useQuery<AccountsData>(GET_ACCOUNTS, {
    variables: { skip: 0, take: 100 },
    skip: !open,
  });
  const { data: productsData } = useQuery<ProductsData>(GET_PRODUCTS, {
    variables: { skip: 0, take: 100 },
    skip: !open,
  });

  const [createOrder, { loading }] = useMutation<CreateOrderMutationResult>(CREATE_ORDER, {
    onCompleted: (data) => {
      if (data?.createOrder) {
        toast.success(
          `Order created – total $${data.createOrder.totalPrice.toFixed(2)}`
        );
        setOpen(false);
        form.reset({ accountId: "", products: [{ id: "", quantity: "1" }] });
      }
    },
    onError: (err) => toast.error(err.message ?? "Failed to create order"),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { accountId: "", products: [{ id: "", quantity: "1" }] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const selectedProducts = form.watch("products");
  const productMap = new Map(
    (productsData?.products ?? []).map((p) => [p.id, p])
  );

  const orderTotal = selectedProducts.reduce((sum, item) => {
    const product = productMap.get(item.id);
    return sum + (product?.price ?? 0) * (parseInt(item.quantity) || 0);
  }, 0);

  const onSubmit = (values: FormValues) => {
    void createOrder({
      variables: {
        accountId: values.accountId,
        products: values.products.map((p) => ({
          id: p.id,
          quantity: parseInt(p.quantity),
        })),
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          New Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Order</DialogTitle>
          <DialogDescription>
            Place an order for an account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[60vh] pr-1">
              <div className="space-y-4 p-1">
                {/* Account selector */}
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger disabled={loading}>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(accountsData?.accounts ?? []).map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Product lines */}
                <div className="space-y-3">
                  <FormLabel>Products</FormLabel>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-start">
                      <FormField
                        control={form.control}
                        name={`products.${index}.id`}
                        render={({ field: f }) => (
                          <FormItem className="flex-1">
                            <Select onValueChange={f.onChange} value={f.value}>
                              <FormControl>
                                <SelectTrigger disabled={loading}>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(productsData?.products ?? []).map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} – ${p.price.toFixed(2)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`products.${index}.quantity`}
                        render={({ field: f }) => (
                          <FormItem className="w-20">
                            <FormControl>
                              <Input
                                {...f}
                                type="number"
                                min={1}
                                max={999}
                                placeholder="Qty"
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1 || loading}
                        aria-label="Remove product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => append({ id: "", quantity: "1" })}
                    disabled={loading}
                  >
                    <Plus className="h-3 w-3" />
                    Add Product
                  </Button>
                </div>

                {/* Order total preview */}
                {orderTotal > 0 && (
                  <div className="rounded-md bg-muted px-4 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Estimated Total</span>
                      <span className="font-semibold text-foreground">
                        ${orderTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Place Order
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
